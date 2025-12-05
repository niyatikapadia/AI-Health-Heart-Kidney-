from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import joblib
import tensorflow as tf
import cv2
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.efficientnet import preprocess_input

app = FastAPI()

# =========================================================
# ✅ CORS Settings (allow frontend to call this API)
# =========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ✅ Load All Models
# =========================================================

# --- 1️⃣ XGBoost Tabular Model ---
xgb_package = joblib.load("../models/hypertension_model.pkl")
if isinstance(xgb_package, dict) and "model" in xgb_package:
    xgb_model = xgb_package["model"]
else:
    xgb_model = xgb_package

good_features = joblib.load("../models/model_features.pkl")

# --- 2️⃣ DR (Retina) Model ---
dr_model = load_model("../models/best_focalnet_dr.keras", compile=False)

# --- 3️⃣ Nail Disease CNN Model ---
def build_nail_model():
    base = tf.keras.applications.EfficientNetB1(
        include_top=False, weights="imagenet", input_shape=(224, 224, 3)
    )
    base.trainable = False
    x = tf.keras.layers.GlobalAveragePooling2D()(base.output)
    x = tf.keras.layers.Dense(512, activation="swish")(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    x = tf.keras.layers.Dense(256, activation="swish")(x)
    x = tf.keras.layers.Dropout(0.25)(x)
    out = tf.keras.layers.Dense(3, activation="softmax")(x)
    model = tf.keras.Model(inputs=base.input, outputs=out)
    model.load_weights("../models/nail_disease_model_weights.h5")
    return model

nail_model = build_nail_model()
NAIL_CLASSES = {0: "Low Risk (Healthy)", 1: "Diabetes Risk", 2: "Hypertension Risk"}

# =========================================================
# ✅ Helper Functions
# =========================================================

def preprocess_dr_image(file_bytes):
    """Preprocess retina (DR) image"""
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    img = cv2.resize(img, (224, 224))
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l2 = clahe.apply(l)
    lab2 = cv2.merge((l2, a, b))
    img_rgb = cv2.cvtColor(lab2, cv2.COLOR_LAB2RGB)
    img_rgb = np.expand_dims(img_rgb.astype(np.float32) / 255.0, axis=0)
    return img_rgb


def preprocess_nail_image(file_bytes):
    """Preprocess nail image"""
    arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    img = cv2.resize(img, (224, 224))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = np.expand_dims(img.astype(np.float32), axis=0)
    return preprocess_input(img)


def dynamic_fusion(tab_score, nail_probs, dr_prob):
    """Fuse model outputs dynamically"""
    conf_tab, conf_nail, conf_dr = tab_score, np.max(nail_probs), dr_prob
    total = conf_tab + conf_nail + conf_dr
    if total == 0:
        total = 1e-8

    w_tab, w_nail, w_dr = conf_tab / total, conf_nail / total, conf_dr / total

    fused = {
        "Diabetes": w_nail * nail_probs[1] + w_tab * tab_score,
        "Hypertension": w_nail * nail_probs[2] + w_tab * tab_score,
        "Kidney/DR": w_dr * dr_prob,
    }
    total_sum = sum(fused.values())
    fused_norm = {k: float(v / total_sum) for k, v in fused.items()}
    return fused_norm, (w_tab, w_nail, w_dr)

# =========================================================
# ✅ Prediction Endpoint
# =========================================================

@app.post("/predict")
async def predict(
    nail_image: UploadFile,
    dr_image: UploadFile,
    Age: int = Form(...),
    Gender: int = Form(...),
    Weight_kg: float = Form(...),
    Height_cm: float = Form(...),
    Daily_Steps: int = Form(...),
    Exercise_Hours_per_Week: float = Form(...),
    Sleep_Hours: float = Form(...),
    Alcohol_per_Week: int = Form(...),
    Calories_per_Day: int = Form(...),
):
    # --- 1️⃣ Build Tabular DataFrame ---
    df = pd.DataFrame(
        [
            {
                "Weight_kg_x": Weight_kg,
                "Height_cm_x": Height_cm,
                "Daily_Steps": Daily_Steps,
                "Exercise_Hours_per_Week": Exercise_Hours_per_Week,
                "Hours_of_Sleep": Sleep_Hours,
                "Alcohol_Consumption_per_Week": Alcohol_per_Week,
                "Calories_kcal_per_day": Calories_per_Day,
                "Age": Age,
                "Gender": Gender,
            }
        ]
    )

    # --- 2️⃣ Feature Engineering ---
    df["BMI"] = df["Weight_kg_x"] / (df["Height_cm_x"] / 100) ** 2
    df["Obese"] = (df["BMI"] >= 30).astype(int)
    df["LowSteps"] = (df["Daily_Steps"] < 5000).astype(int)
    df["LowSleep"] = (df["Hours_of_Sleep"] < 6).astype(int)
    df["HighAlcohol"] = (df["Alcohol_Consumption_per_Week"] >= 7).astype(int)
    df["RiskFlagsSum"] = df[["Obese", "LowSteps", "LowSleep", "HighAlcohol"]].sum(axis=1)

    # --- 3️⃣ Handle Gender Encoding & Safe Feature Selection ---
    df["Gender_encoded"] = df["Gender"]
    df = df.drop(columns=["Gender"], errors="ignore")

    # Align DataFrame with model features
    available_features = [f for f in good_features if f in df.columns]
    user_features = df[available_features]

    # --- 4️⃣ Reorder Columns to Match Training Order ---
    expected_order = xgb_model.get_booster().feature_names
    user_features = user_features.reindex(columns=expected_order, fill_value=0)

    # --- 5️⃣ Tabular Prediction ---
    tab_score = float(xgb_model.predict_proba(user_features)[:, 1][0])

    # --- 6️⃣ Nail Model Prediction ---
    nail_bytes = await nail_image.read()
    nail_probs = nail_model.predict(preprocess_nail_image(nail_bytes)).flatten()

    # --- 7️⃣ DR Model Prediction ---
    dr_bytes = await dr_image.read()
    dr_prob = float(dr_model.predict(preprocess_dr_image(dr_bytes))[0][0])

    # --- 8️⃣ Fusion ---
    fused, weights = dynamic_fusion(tab_score, nail_probs, dr_prob)

    # --- 9️⃣ Return JSON Response ---
    return {
        "tabular_score": tab_score,
        "nail_probs": {
            "Low Risk": float(nail_probs[0]),
            "Diabetes": float(nail_probs[1]),
            "Hypertension": float(nail_probs[2]),
        },
        "dr_prob": dr_prob,
        "fused_risks": fused,
        "model_weights": {
            "Tabular": float(weights[0]),
            "Nail": float(weights[1]),
            "DR": float(weights[2]),
        },
    }

# =========================================================
# ✅ Root Endpoint
# =========================================================
@app.get("/")
def root():
    return {"message": "✅ API is running. Use /predict to POST images and tabular data."}
