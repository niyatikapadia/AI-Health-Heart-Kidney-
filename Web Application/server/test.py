import joblib
xgb = joblib.load("../models/hypertension_model.pkl")
if isinstance(xgb, dict):
    xgb = xgb["model"]

print("MODEL FEATURE NAMES:", xgb.get_booster().feature_names)
