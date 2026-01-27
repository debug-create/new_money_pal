import pandas as pd
from prophet import Prophet
from datetime import datetime
from typing import List, Dict

class SpendingPredictor:
    def predict_monthly_spending(self, transactions: List[any]) -> Dict:
        if not transactions:
            return {"predicted_total": 0, "status": "insufficient_data"}

        # Prepare DataFrame for Prophet
        df = pd.DataFrame([{
            'ds': t.date.date(),
            'y': t.amount
        } for t in transactions])
        
        # Aggregate by day
        df = df.groupby('ds')['y'].sum().reset_index()
        
        # Need at least a few data points
        if len(df) < 5:
             return {"predicted_total": df['y'].sum(), "status": "insufficient_data"}

        # Train Model
        model = Prophet(yearly_seasonality=False, daily_seasonality=False)
        model.fit(df)
        
        # Predict end of month
        future = model.make_future_dataframe(periods=30)
        forecast = model.predict(future)
        
        current_month = datetime.now().month
        
        # Filter for current month
        mask = (forecast['ds'].dt.month == current_month)
        predicted_total = forecast.loc[mask, 'yhat'].sum()
        
        return {
            "predicted_total": max(0, float(predicted_total)),
            "status": "success",
            "trend": forecast[['ds', 'yhat']].tail(14).to_dict('records') # Last 14 days trend
        }