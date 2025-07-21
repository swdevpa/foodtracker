# 🔒 API Key Security

## ⚠️ **WICHTIG: API Keys niemals exposed lassen!**

### 🚨 **Problem mit Client-Side API Keys:**
- API Keys in React Native Apps sind **IMMER sichtbar** für jeden
- Jeder kann den Bundle reverse-engineeren und die Keys extrahieren
- **NIEMALS echte API Keys in .env für Production verwenden!**

### ✅ **Sichere Lösungsansätze:**

#### **Option 1: Backend Proxy (EMPFOHLEN)**
```
Frontend App → Dein Backend → Google Gemini/USDA API
```

**Vorteile:**
- API Keys bleiben auf dem Server
- Rate Limiting & Caching möglich
- Bessere Kontrolle über API Calls

**Implementation:**
- Express.js/Node.js Server
- Environment Variables auf Server
- JWT/API Key Authentication zwischen App und Backend

#### **Option 2: Expo Secrets (Teilweise sicher)**
```bash
# Nur für EAS Build verfügbar
eas secret:create --name GEMINI_API_KEY --value "dein-key"
```

**⚠️ Warnung:** Keys sind immer noch im Bundle sichtbar!

#### **Option 3: Development Only**
```bash
# Kopiere .env.example zu .env
cp .env.example .env

# Füge deine DEVELOPMENT Keys hinzu (nur für Testing!)
GEMINI_API_KEY=dein-dev-key-hier
USDA_API_KEY=dein-usda-key-hier
```

### 🛡️ **Best Practices für Production:**

1. **Backend API erstellen:**
```js
// server/routes/recipes.js
app.post('/api/generate-recipes', authenticate, async (req, res) => {
  const { userProfile, inventory, mealTypes } = req.body;
  
  // Server-side API call mit sicherem Key
  const recipes = await geminiService.generateRecipes(
    userProfile, inventory, mealTypes
  );
  
  res.json(recipes);
});
```

2. **App Service anpassen:**
```js
// Statt direkter API Calls:
const response = await fetch('YOUR_BACKEND/api/generate-recipes', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + userToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ userProfile, inventory, mealTypes })
});
```

3. **Rate Limiting & Monitoring:**
- API Usage tracking
- User-based rate limits
- Cost monitoring
- Error handling

### 🔧 **Für lokale Entwicklung:**

```bash
# 1. Dependencies installieren
npm install

# 2. Environment Variables setzen
cp .env.example .env
# Dann .env mit deinen DEV keys bearbeiten

# 3. App starten
npx expo start
```

### 📋 **Production Deployment Checklist:**

- [ ] Backend API erstellt
- [ ] API Keys nur auf Server
- [ ] Authentication implementiert
- [ ] Rate Limiting aktiviert
- [ ] Monitoring & Logging
- [ ] Error Handling
- [ ] .env aus Git excluded
- [ ] Secrets Management (AWS Secrets Manager, etc.)

### 🎯 **Kosten-Optimierung:**

- **Caching:** Ähnliche Requests cachen
- **Rate Limiting:** User-basierte Limits
- **Batch Requests:** Multiple Rezepte in einem Call
- **Fallback:** Lokale Nährstoffdatenbank bei API Limits

---

**Fazit:** Für echte Production-Apps **IMMER** ein Backend verwenden! 
Die aktuelle Implementation ist nur für Development/Prototyping geeignet.