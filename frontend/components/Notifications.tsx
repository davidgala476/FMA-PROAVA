import { useEffect, useRef, useState } from 'react';

type Note = {
  id: number;
  message: string;
  ts: string;
  key?: string;
};
export default function Notifications() {
  const [notes, setNotes] = useState<Note[]>([]);
  const keyToId = useRef<Map<string, number>>(new Map());
  // timers 
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    let ws: WebSocket | null = null;
    let connected = false;
    const setConnected = (v: boolean) => { connected = v; };
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const url = (process.env.NEXT_PUBLIC_WS_URL && process.env.NEXT_PUBLIC_WS_URL !== '')
      ? process.env.NEXT_PUBLIC_WS_URL
      : `ws://${host}:8080/ws`;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      console.warn('WebSocket no disponible', err);
      return;
    }
    ws.onopen = () => {
      console.info('WebSocket conectado a', url);
      setConnected(true);
    };

    ws.onmessage = (evt) => {
      try {
        console.debug('WS message raw:', evt.data);
      } catch {}
      const now = Date.now();
      try {
        const payload = JSON.parse(evt.data);
        let message = '';
        let action: string | undefined;
        let resource: string | undefined;

        if (payload && payload.type === 'notification') {
          action = payload.action || 'NOTIFICATION';
          if (action === 'ALCHEMIST_CREATED') {
            message = `Nuevo alquimista: ${payload.alchemist?.name || payload.alchemist?.Name || 'desconocido'}`;
            resource = payload.alchemist ? `alchemist:${payload.alchemist?.id || payload.alchemist?.ID || ''}` : undefined;
          } else if (action === 'TRANSMUTATION_CREATED') {
            message = `Solicitud de transmutación creada (id: ${payload.transmutation?.ID || payload.transmutation?.id || ''})`;
            resource = payload.transmutation ? `transmutation:${payload.transmutation?.id || payload.transmutation?.ID || ''}` : undefined;
          } else if (action === 'MISSION_CREATED') {
            message = `Misión asignada: ${payload.mission?.title || payload.mission?.Title || ''}`;
            resource = payload.mission ? `mission:${payload.mission?.id || payload.mission?.ID || ''}` : undefined;
          } else {
            return;
          }
        } else if (payload && payload.action) {
          action = payload.action;
          resource = payload.resource;
          const allowed = new Set([
            'TRANSMUTATION_APPROVED',
            'TRANSMUTATION_REJECTED',
            'TRANSMUTATION_CREATED',
            'MISSION_CREATED',
            'OVERDUE_MISSION',
            'STALE_MISSION',
            'HIGH_MATERIAL_USAGE'
          ]);
          if (!allowed.has(action)) return;
          switch (action) {
            case 'TRANSMUTATION_APPROVED':
              message = `Transmutación aprobada: ${payload.resource || ''}`;
              break;
            case 'TRANSMUTATION_REJECTED':
              message = `Transmutación rechazada: ${payload.resource || ''} - ${payload.details || ''}`;
              break;
            case 'TRANSMUTATION_CREATED':
              message = `Solicitud de transmutación: ${payload.resource || ''}`;
              break;
            case 'MISSION_CREATED':
              message = `Misión creada: ${payload.resource || ''}`;
              break;
            case 'OVERDUE_MISSION':
            case 'STALE_MISSION':
              message = `Atención misión: ${payload.details || payload.resource || action}`;
              break;
            case 'HIGH_MATERIAL_USAGE':
              message = `Alto uso de material: ${payload.details || ''}`;
              break;
          }
        } else {
          return;
        }
        if (action && action.startsWith && action.startsWith('API_')) {
          return;
        }

        const key = action && resource ? `${action}:${resource}` : undefined;

        if (key && keyToId.current.has(key)) {
          const prevId = keyToId.current.get(key)!;
          // limpiar timeout previo
          const prevTimer = timers.current.get(prevId);
          if (prevTimer) {
            clearTimeout(prevTimer);
            timers.current.delete(prevId);
          }
          // reemplazar la nota previa por la nueva 
          setNotes((s) => {
            const filtered = s.filter((n) => n.id !== prevId);
            const newNote: Note = { id: now, message, ts: new Date().toLocaleTimeString(), key };
            return [newNote, ...filtered].slice(0, 6);
          });
          keyToId.current.set(key, now);
        } else {
          // agregar nueva nota
          const newNote: Note = { id: now, message, ts: new Date().toLocaleTimeString(), key };
          setNotes((s) => [newNote, ...s].slice(0, 6));
          if (key) keyToId.current.set(key, now);
        }

        // programar auto-dismiss en 7 segundos
        const t = setTimeout(() => {
          setNotes((s) => s.filter((n) => n.id !== now));
          if (key) keyToId.current.delete(key);
          timers.current.delete(now);
        }, 7000);
        timers.current.set(now, t);
      } catch (e) {
        const id = Date.now();
        const raw = typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data);
        setNotes((s) => [{ id, message: raw, ts: new Date().toLocaleTimeString() }, ...s].slice(0, 6));
        const t = setTimeout(() => {
          setNotes((s) => s.filter((n) => n.id !== id));
          timers.current.delete(id);
        }, 7000);
        timers.current.set(id, t);
      }
    };

    ws.onclose = () => {
      console.info('WebSocket cerrado');
      setConnected(false);
    };

    ws.onerror = (e) => {
      console.warn('WebSocket error', e);
    };

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
// limpiar timers pendientes
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      keyToId.current.clear();
    };
  }, []);
  return (
    <div className="fixed right-4 top-16 z-50 w-80">
      {/* connection indicator */}
      <div style={{ position: 'absolute', right: 8, top: -28 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: 'green' }} title="WebSocket connected" />
      </div>
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="bg-white shadow-md rounded p-3 text-sm">
            <div className="text-gray-700 break-words">{n.message}</div>
            <div className="text-xs text-gray-400 mt-1">{n.ts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}