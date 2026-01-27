class TransactionCategorizer:
    def __init__(self):
        self.keyword_map = {
            "swiggy": "food_dining",
            "zomato": "food_dining",
            "dominos": "food_dining",
            "kfc": "food_dining",
            "uber": "transport",
            "ola": "transport",
            "rapido": "transport",
            "metro": "transport",
            "irctc": "travel",
            "makemytrip": "travel",
            "bookmyshow": "entertainment",
            "pvr": "entertainment",
            "netflix": "entertainment",
            "spotify": "entertainment",
            "amazon": "shopping",
            "flipkart": "shopping",
            "myntra": "shopping",
            "zudio": "shopping",
            "jiomart": "groceries",
            "blinkit": "groceries",
            "zepto": "groceries",
            "bigbasket": "groceries",
            "apollo": "health_medical",
            "pharmacy": "health_medical",
            "bescom": "bills_utilities",
            "water": "bills_utilities",
            "electricity": "bills_utilities",
            "wifi": "bills_utilities",
            "jio": "bills_utilities",
            "airtel": "bills_utilities",
            "salary": "income",
            "interest": "income",
            "rent": "housing",
            "sip": "investments",
            "zerodha": "investments",
            "groww": "investments"
        }

    def categorize(self, description: str, merchant: str = None) -> dict:
        text = f"{description} {merchant or ''}".lower()
        
        for keyword, category in self.keyword_map.items():
            if keyword in text:
                return {"category": category, "confidence": 0.95}
        
        if any(word in text for word in ["food", "tea", "coffee", "restaurant", "cafe"]):
            return {"category": "food_dining", "confidence": 0.8}
        if any(word in text for word in ["market", "store", "supermarket"]):
            return {"category": "groceries", "confidence": 0.7}
        if any(word in text for word in ["fuel", "petrol", "diesel", "parking"]):
            return {"category": "transport", "confidence": 0.8}
            
        return {"category": "others", "confidence": 0.5}