package internal

import (
	"time"
)

type Alchemist struct {
	ID             uint      `json:"id" gorm:"primaryKey"`
	MilitaryID     string    `json:"military_id" gorm:"uniqueIndex:idx_military_id;not null"`
	Name           string    `json:"name" gorm:"not null"`
	Title          string    `json:"title"`
	Specialization string    `json:"specialization"`
	Rank           string    `json:"rank" gorm:"default:'Lieutenant'"`
	Status         string    `json:"status" gorm:"default:'active'"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Material struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	Name            string    `json:"name" gorm:"not null;unique"`
	Classification  string    `json:"classification"`
	EquivalentValue float64   `json:"equivalent_value" gorm:"default:1.0"`
	StockQuantity   int       `json:"stock_quantity" gorm:"default:0"`
	CreatedAt       time.Time `json:"created_at"`
}

type Mission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title" gorm:"not null"`
	Description string    `json:"description"`
	AssignedTo  uint      `json:"assigned_to"`
	Alchemist   Alchemist `json:"alchemist" gorm:"foreignKey:AssignedTo"`
	Priority    string    `json:"priority" gorm:"default:'medium'"`
	Status      string    `json:"status" gorm:"default:'pending'"`
	Deadline    time.Time `json:"deadline"`
	CreatedAt   time.Time `json:"created_at"`
}

type Transmutation struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	AlchemistID        uint      `json:"alchemist_id"`
	Alchemist          Alchemist `json:"alchemist" gorm:"foreignKey:AlchemistID"`
	Objective          string    `json:"objective" gorm:"not null"`
	InputMaterial      string    `json:"input_material"`
	OutputMaterial     string    `json:"output_material"`
	CircleDiagram      string    `json:"circle_diagram"`
	Cost               float64   `json:"cost" gorm:"default:0.0"`
	SuccessRate        int       `json:"success_rate" gorm:"default:50"`
	Result             string    `json:"result"`
	ResultQuantity     float64   `json:"result_quantity" gorm:"default:0.0"`
	Status             string    `json:"status" gorm:"default:'pending_review'"`
	EquivalentVerified bool      `json:"equivalent_verified" gorm:"default:false"`
	CouncilApproval    bool      `json:"council_approval" gorm:"default:false"`
	CreatedAt          time.Time `json:"created_at"`
}

type CouncilReview struct {
	ID              uint          `json:"id" gorm:"primaryKey"`
	TransmutationID uint          `json:"transmutation_id"`
	Transmutation   Transmutation `json:"transmutation" gorm:"foreignKey:TransmutationID"`
	ReviewerID      uint          `json:"reviewer_id"`
	Reviewer        Alchemist     `json:"reviewer" gorm:"foreignKey:ReviewerID"`
	Comments        string        `json:"comments"`
	Status          string        `json:"status" gorm:"default:'under_review'"`
	ReviewedAt      time.Time     `json:"reviewed_at"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func SuccessResponse(data interface{}) APIResponse {
	return APIResponse{
		Success: true,
		Message: "Operación exitosa",
		Data:    data,
	}
}

func ErrorResponse(message string) APIResponse {
	return APIResponse{
		Success: false,
		Message: message,
		Error:   message,
	}
}
