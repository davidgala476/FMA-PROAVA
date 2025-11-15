package internal

import (
	"fmt"
	"math"
	"math/rand"
	"time"
)

type TransmutationSimulator struct {
	MaterialCosts map[string]float64
	ConversionMap map[string]map[string]float64
}

func NewTransmutationSimulator() *TransmutationSimulator {
	return &TransmutationSimulator{
		MaterialCosts: map[string]float64{
			"iron":     10.0,
			"carbon":   15.0,
			"copper":   20.0,
			"aluminum": 12.0,
			"gold":     100.0,
			"silver":   50.0,
			"lead":     8.0,
			"tin":      18.0,
			"water":    1.0,
			"stone":    2.0,
		},
		ConversionMap: map[string]map[string]float64{
			"iron": {
				"steel": 1.5,
				"rust":  0.8,
				"wire":  2.0,
				"nails": 3.0,
			},
			"carbon": {
				"diamond":  0.5,
				"graphite": 1.2,
				"coal":     1.5,
			},
			"copper": {
				"bronze": 1.8,
				"wire":   2.2,
				"coins":  2.5,
			},
			"water": {
				"ice":      1.0,
				"steam":    1.0,
				"hydrogen": 0.8,
			},
			"gold": {
				"jewelry": 0.9,
				"coins":   1.0,
				"powder":  1.5,
			},
			"silver": {
				"jewelry": 0.95,
				"coins":   1.1,
				"mirror":  1.3,
			},
		},
	}
}
func (ts *TransmutationSimulator) SimulateCost(inputMaterial string, outputMaterial string) float64 {
	materialLower := inputMaterial
	baseCost := ts.MaterialCosts[materialLower]
	if baseCost == 0 {
		baseCost = 25.0
	}
	if conversionMap, exists := ts.ConversionMap[materialLower]; exists {
		if conversionFactor, exists := conversionMap[outputMaterial]; exists {
			baseCost *= conversionFactor
		}
	}
	circleBaseCost := baseCost * 0.1
	totalCost := baseCost + circleBaseCost
	return math.Round(totalCost*100) / 100
}
func (ts *TransmutationSimulator) SimulateSuccessRate(inputMaterial string, outputMaterial string) int {
	baseProbability := 50
	commonTransmutations := map[string]map[string]int{
		"iron": {
			"steel": 85,
			"rust":  95,
			"wire":  80,
			"nails": 90,
		},
		"water": {
			"ice":   95,
			"steam": 95,
		},
		"carbon": {
			"diamond":  20,
			"graphite": 75,
			"coal":     90,
		},
		"gold": {
			"jewelry": 70,
			"coins":   80,
		},
	}
	if rates, exists := commonTransmutations[inputMaterial]; exists {
		if rate, exists := rates[outputMaterial]; exists {
			return rate
		}
	}
	return baseProbability
}
func (ts *TransmutationSimulator) SimulateResult(inputMaterial string, outputMaterial string, quantity float64) (string, float64) {
	rand.Seed(time.Now().UnixNano())
	successRate := ts.SimulateSuccessRate(inputMaterial, outputMaterial)
	randomValue := rand.Intn(100)
	var resultQuantity float64
	var status string
	if randomValue < successRate {
		status = "success"
		if conversionMap, exists := ts.ConversionMap[inputMaterial]; exists {
			if conversionFactor, exists := conversionMap[outputMaterial]; exists {
				resultQuantity = quantity * conversionFactor
			} else {
				resultQuantity = quantity * 0.9
			}
		} else {
			resultQuantity = quantity * 0.9
		}
		variation := (rand.Float64() * 0.15) - 0.05
		resultQuantity *= (1 + variation)

	} else if randomValue < successRate+15 {
		status = "partial"
		resultQuantity = quantity * 0.5
	} else {
		status = "failure"
		resultQuantity = 0
	}
	return status, math.Round(resultQuantity*100) / 100
}
func (ts *TransmutationSimulator) GetSimulationDetails(inputMaterial string, outputMaterial string, quantity float64) map[string]interface{} {
	cost := ts.SimulateCost(inputMaterial, outputMaterial)
	successRate := ts.SimulateSuccessRate(inputMaterial, outputMaterial)
	result, resultQuantity := ts.SimulateResult(inputMaterial, outputMaterial, quantity)
	return map[string]interface{}{
		"input_material":  inputMaterial,
		"output_material": outputMaterial,
		"input_quantity":  quantity,
		"cost":            cost,
		"success_rate":    successRate,
		"result":          result,
		"result_quantity": resultQuantity,
		"description":     fmt.Sprintf("Transmuting %v units of %s to %s", quantity, inputMaterial, outputMaterial),
	}
}
