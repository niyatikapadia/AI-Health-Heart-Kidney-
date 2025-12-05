"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Upload, ArrowLeft } from "lucide-react"

type RiskLevel = "low" | "medium" | "high"

interface Results {
  hypertension: number
  diabetes: number
  kidney: number
}

export default function HealthRiskScreener() {
 const [formData, setFormData] = useState({
  age: "",
  gender: "",
  height: "",
  weight: "",
  daily_steps: "",
  exercise_hours: "",
  sleep_hours: "",
  alcohol_per_week: "",
  calories_per_day: "",
})


  const [retinaImage, setRetinaImage] = useState<File | null>(null)
  const [nailbedImage, setNailbedImage] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState(0)
  const [results, setResults] = useState<Results | null>(null)

  const loadingMessages = [
    "Analyzing tabular data…",
    "Processing retina image…",
    "Detecting nailbed anomalies…",
    "Finalizing results…",
  ]

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setLoadingPhase(0)

  try {
    const form = new FormData()
    form.append("Age", formData.age)
    form.append("Gender", formData.gender)
    form.append("Weight_kg", formData.weight)
    form.append("Height_cm", formData.height)
    form.append("Daily_Steps", formData.daily_steps)
    form.append("Exercise_Hours_per_Week", formData.exercise_hours)
    form.append("Sleep_Hours", formData.sleep_hours)
    form.append("Alcohol_per_Week", formData.alcohol_per_week)
    form.append("Calories_per_Day", formData.calories_per_day)
    form.append("nail_image", nailbedImage!)
    form.append("dr_image", retinaImage!)

    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      body: form,
    })

    const data = await response.json()

    setResults({
      hypertension: Math.round(data.fused_risks["Hypertension"] * 100),
      diabetes: Math.round(data.fused_risks["Diabetes"] * 100),
      kidney: Math.round(data.fused_risks["Kidney/DR"] * 100),
    })
  } catch (error) {
    console.error(error)
    alert("Something went wrong! Please check your inputs or backend.")
  } finally {
    setIsLoading(false)
  }
}



  const getRiskLevel = (percentage: number): RiskLevel => {
    if (percentage < 40) return "low"
    if (percentage < 70) return "medium"
    return "high"
  }

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "low":
        return "bg-green-500"
      case "medium":
        return "bg-orange-500"
      case "high":
        return "bg-red-500"
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "retina" | "nailbed") => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === "retina") {
        setRetinaImage(file)
      } else {
        setNailbedImage(file)
      }
    }
  }

  const handleReset = () => {
    setResults(null)
    setFormData({
      age: "",
      gender: "",
      ethnicity: "",
      height: "",
      height_unit: "cm",
      weight: "",
      weight_unit: "kg",
      alcohol_consumption: "",
      exercise_hours: "",
      hours_of_sleep: "",
      daily_steps: "",
      diet_quality: [5],
      sodium_mg: "",
      calories_kcal: "",
    })
    setRetinaImage(null)
    setNailbedImage(null)
  }

  if (results && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white py-12 px-4 animate-in fade-in duration-500">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <Button onClick={handleReset} variant="ghost" className="mb-8 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Form
          </Button>

          {/* Results Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">
              Your Health Risk Assessment
            </h1>
            <p className="text-lg text-gray-600 text-balance">Based on your health metrics and image analysis</p>
          </div>

          {/* Results Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Hypertension Risk */}
            <Card className="backdrop-blur-lg bg-white/70 border-white/20 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-100">
              <CardHeader>
                <CardTitle className="text-center text-xl">Hypertension Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 mb-4">{results.hypertension}%</div>
                  <div
                    className={`inline-block px-6 py-2 rounded-full text-white font-semibold text-sm ${getRiskColor(getRiskLevel(results.hypertension))}`}
                  >
                    {getRiskLevel(results.hypertension).toUpperCase()} RISK
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mt-6">
                  <div
                    className={`h-full transition-all duration-1000 ${getRiskColor(getRiskLevel(results.hypertension))}`}
                    style={{ width: `${results.hypertension}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Diabetes Risk */}
            <Card className="backdrop-blur-lg bg-white/70 border-white/20 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-200">
              <CardHeader>
                <CardTitle className="text-center text-xl">Diabetes Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 mb-4">{results.diabetes}%</div>
                  <div
                    className={`inline-block px-6 py-2 rounded-full text-white font-semibold text-sm ${getRiskColor(getRiskLevel(results.diabetes))}`}
                  >
                    {getRiskLevel(results.diabetes).toUpperCase()} RISK
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mt-6">
                  <div
                    className={`h-full transition-all duration-1000 ${getRiskColor(getRiskLevel(results.diabetes))}`}
                    style={{ width: `${results.diabetes}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* Kidney Risk */}
            <Card className="backdrop-blur-lg bg-white/70 border-white/20 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-300">
              <CardHeader>
                <CardTitle className="text-center text-xl">Kidney Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl font-bold text-gray-900 mb-4">{results.kidney}%</div>
                  <div
                    className={`inline-block px-6 py-2 rounded-full text-white font-semibold text-sm ${getRiskColor(getRiskLevel(results.kidney))}`}
                  >
                    {getRiskLevel(results.kidney).toUpperCase()} RISK
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mt-6">
                  <div
                    className={`h-full transition-all duration-1000 ${getRiskColor(getRiskLevel(results.kidney))}`}
                    style={{ width: `${results.kidney}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Information Card */}
          <Card className="backdrop-blur-lg bg-white/70 border-white/20 shadow-xl animate-in slide-in-from-bottom-4 duration-500 delay-400">
            <CardHeader>
              <CardTitle>What do these results mean?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Low Risk (0-39%)</p>
                    <p className="text-sm text-gray-600">
                      Your current health metrics indicate a low risk. Continue maintaining healthy habits.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-orange-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Medium Risk (40-69%)</p>
                    <p className="text-sm text-gray-600">
                      Consider lifestyle modifications and consult with a healthcare provider.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500 mt-1 flex-shrink-0"></div>
                  <div>
                    <p className="font-semibold text-gray-900">High Risk (70-100%)</p>
                    <p className="text-sm text-gray-600">
                      We recommend scheduling an appointment with your doctor for further evaluation.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button onClick={handleReset} size="lg" className="min-w-[200px]">
              Analyze Again
            </Button>
            <Button variant="outline" size="lg" className="min-w-[200px] bg-transparent">
              Download Report
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">
            AI-Powered Health Risk Screener
          </h1>
          <p className="text-lg text-gray-600 text-balance">
            Non-invasive early detection for Hypertension, Diabetes, and Kidney Disease.
          </p>
        </div>

        {/* Form Card with Glassmorphism */}
        <Card className="backdrop-blur-lg bg-white/70 border-white/20 shadow-xl mb-8">
          <CardHeader>
            <CardTitle>Health Information</CardTitle>
            <CardDescription>Please fill in your health metrics for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="age">Age</Label>
      <Input
        id="age"
        type="number"
        placeholder="e.g., 45"
        value={formData.age}
        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="gender">Gender</Label>
      <Select
        value={formData.gender}
        onValueChange={(value) => setFormData({ ...formData, gender: value })}
      >
        <SelectTrigger id="gender">
          <SelectValue placeholder="Select gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Male</SelectItem>
          <SelectItem value="0">Female</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label htmlFor="height">Height (cm)</Label>
      <Input
        id="height"
        type="number"
        placeholder="e.g., 170"
        value={formData.height}
        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="weight">Weight (kg)</Label>
      <Input
        id="weight"
        type="number"
        placeholder="e.g., 70"
        value={formData.weight}
        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="steps">Daily Steps</Label>
      <Input
        id="steps"
        type="number"
        placeholder="e.g., 5000"
        value={formData.daily_steps}
        onChange={(e) => setFormData({ ...formData, daily_steps: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="exercise">Exercise Hours per Week</Label>
      <Input
        id="exercise"
        type="number"
        step="0.5"
        placeholder="e.g., 4"
        value={formData.exercise_hours}
        onChange={(e) => setFormData({ ...formData, exercise_hours: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="sleep">Hours of Sleep</Label>
      <Input
        id="sleep"
        type="number"
        step="0.5"
        placeholder="e.g., 7"
        value={formData.sleep_hours}
        onChange={(e) => setFormData({ ...formData, sleep_hours: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="alcohol">Alcohol per Week</Label>
      <Input
        id="alcohol"
        type="number"
        placeholder="e.g., 2"
        value={formData.alcohol_per_week}
        onChange={(e) => setFormData({ ...formData, alcohol_per_week: e.target.value })}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="calories">Calories per Day</Label>
      <Input
        id="calories"
        type="number"
        placeholder="e.g., 2000"
        value={formData.calories_per_day}
        onChange={(e) => setFormData({ ...formData, calories_per_day: e.target.value })}
        required
      />
    </div>
  </div>

  {/* Image Upload */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
    <div className="space-y-2">
      <Label>Retina Image</Label>
      <input
        type="file"
        accept=".jpg,.png"
        onChange={(e) => handleFileChange(e, "retina")}
        required
      />
    </div>

    <div className="space-y-2">
      <Label>Nail Image</Label>
      <input
        type="file"
        accept=".jpg,.png"
        onChange={(e) => handleFileChange(e, "nailbed")}
        required
      />
    </div>
  </div>

  <Button type="submit" className="w-full mt-6" size="lg" disabled={isLoading}>
    Analyze My Health Risk
  </Button>
</form>

          </CardContent>
        </Card>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <Card className="w-full max-w-md mx-4 backdrop-blur-lg bg-white/90 border-white/20 shadow-2xl">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-teal-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-lg font-medium text-gray-900 animate-pulse">{loadingMessages[loadingPhase]}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
