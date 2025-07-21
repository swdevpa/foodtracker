# Product Requirements Document (PRD)
## Food Tracker App

### 1. Produktübersicht

**Vision**: Eine intelligente Expo Go iOS App, die Nutzern hilft, personalisierte Mahlzeiten basierend auf verfügbaren Lebensmitteln und individuellen Gesundheitszielen zu erstellen.

**Mission**: Optimierung der Ernährung durch KI-gestützte Rezeptvorschläge mit detaillierter Nährstoffanalyse.

### 2. Zielgruppe

**Primäre Zielgruppe**: 
- Gesundheitsbewusste Erwachsene (18-45 Jahre)
- Personen mit spezifischen Fitnesszielen
- Hobby-Köche, die ihre Kühlschrankbestände optimal nutzen möchten

**Sekundäre Zielgruppe**:
- Fitness-Enthusiasten
- Personen mit Ernährungszielen (Abnehmen, Zunehmen, Erhaltung)

### 3. Kernfunktionalitäten (MVP)

#### 3.1 Lebensmittelinventar
- **Kühlschrank-Management**: Eingabe und Verwaltung verfügbarer Lebensmittel
- **Kategorisierung**: Sortierung nach Kühlschrank, Vorratsschrank, etc.
- **Haltbarkeitsdaten**: Optional für bessere Planung

#### 3.2 Benutzerprofil
- **Persönliche Daten**: 
  - Größe (cm)
  - Gewicht (kg)
  - Alter (Jahre)
  - Geschlecht (männlich/weiblich/divers)
- **Aktivitätslevel**:
  - Berufliche Aktivität (sitzend, stehend, körperlich aktiv)
  - Sport/Training (Art, Häufigkeit, Intensität)
- **Gesundheitsziele**:
  - Muskelaufbau
  - Gewichtsabnahme
  - Gewichtserhaltung

#### 3.6 Apple Health Integration
- **Automatische Datenübernahme**: Import von Größe, Gewicht, Alter aus Apple Health
- **Aktivitätsdaten**: Schritte, verbrannte Kalorien, Workouts
- **Gesundheitsmetriken**: Herzfrequenz, Schlafqualität (für erweiterte Empfehlungen)
- **Bidirektionale Synchronisation**: Export von Nährstoffdaten zurück zu Apple Health
- **Benutzerberechtigungen**: Granulare Kontrolle über geteilte Daten

#### 3.3 KI-basierte Rezeptgenerierung
- **Integration**: Google Gemini Flash 2.5 API
- **Mahlzeitenplanung**:
  - Frühstück (optional)
  - Mittagessen (optional)
  - Abendessen (optional)
  - Snacks (mehrere, optional)
- **Personalisierung**: Basierend auf Profil und Zielen
- **Verfügbarkeit**: Nur Rezepte mit verfügbaren Zutaten

#### 3.4 Detaillierte Rezeptinformationen
- **Zutaten**: Genaue Mengenangaben in Gramm
- **Zubereitungsschritte**: Schritt-für-Schritt Anleitung
- **Zubereitungszeit**: Prep- und Kochzeit
- **Portionsangabe**: Anzahl Portionen

#### 3.5 Nährstoffanalyse
**Pro Rezept**:
- Kalorien (kcal)
- Makronährstoffe:
  - Protein (g)
  - Kohlenhydrate (g)
  - Fett (g)
- Mikronährstoffe (wichtigste):
  - Ballaststoffe (g)
  - Zucker (g)
  - Natrium (mg)

**Tagesgesamtumsatz**:
- Summierung aller gewählten Mahlzeiten
- Vergleich mit empfohlener Tagesmenge
- Zielerreichung in Prozent

### 4. Technische Anforderungen

#### 4.1 Plattform
- **Framework**: Expo Go (React Native)
- **Zielplattform**: iOS (MVP), später Android
- **Mindest-iOS-Version**: iOS 13.0+

#### 4.2 Externe APIs
- **KI-Service**: Google Gemini Flash 2.5
- **Nährstoffdatenbank**: USDA FoodData Central oder ähnlich
- **Backup**: Lokale Nährstoffdatenbank für Offline-Nutzung
- **Apple HealthKit**: Integration für Gesundheitsdaten (iOS)
- **Berechtigungen**: HealthKit Entitlements erforderlich

#### 4.3 Datenspeicherung
- **Lokal**: AsyncStorage für Benutzerdaten und Inventar
- **Cloud**: Optional für Backup und Synchronisation

### 5. Benutzeroberfläche (UI/UX)

#### 5.1 Hauptnavigation
- **Home**: Dashboard mit Tagesübersicht
- **Inventar**: Lebensmittelverwaltung
- **Rezepte**: Generierte Vorschläge
- **Profil**: Einstellungen und persönliche Daten
- **Statistiken**: Nährstofftrends (Future)

#### 5.2 User Journey (MVP)
1. **Onboarding**: Profil erstellen
2. **Apple Health Verbindung**: Optional Health-Daten importieren
3. **Inventar**: Lebensmittel hinzufügen
4. **Mahlzeitenwahl**: Gewünschte Mahlzeiten auswählen
5. **KI-Anfrage**: Rezepte generieren lassen (inkl. Health-Daten)
6. **Auswahl**: Rezepte auswählen und Nährstoffe einsehen
7. **Health Export**: Nährstoffdaten optional zu Apple Health übertragen

### 6. Nicht-funktionale Anforderungen

#### 6.1 Performance
- App-Startzeit: < 3 Sekunden
- KI-Antwortzeit: < 10 Sekunden
- Offline-Funktionalität: Inventarverwaltung

#### 6.2 Sicherheit
- Sichere API-Schlüssel-Verwaltung
- Datenschutz-konforme Speicherung
- DSGVO-Compliance

#### 6.3 Usability
- Intuitive Bedienung
- Responsive Design
- Barrierefreiheit (iOS Accessibility)

### 7. Erfolgsmetriken

#### 7.1 Adoption
- Downloads in ersten 3 Monaten: 1.000+
- Aktive monatliche Nutzer: 500+
- Retention Rate (7 Tage): 40%+

#### 7.2 Engagement
- Durchschnittliche Sessions pro Nutzer/Woche: 3+
- Rezepte pro Session: 2+
- Inventar-Updates pro Woche: 2+

### 8. Roadmap

#### Phase 1 (MVP - 8 Wochen)
- ✅ Benutzerprofil
- ✅ Lebensmittelinventar
- ✅ KI-Integration (Gemini)
- ✅ Grundlegende Nährstoffanalyse
- ✅ Apple Health Integration (Import)
- ✅ iOS App (Expo Go)

#### Phase 2 (Erweiterung - 4 Wochen)
- 🔄 Erweiterte Nährstoffanalyse
- 🔄 Apple Health Export (Nährstoffe)
- 🔄 Favoriten-System
- 🔄 Einkaufsliste-Generierung
- 🔄 Meal Prep Planer

#### Phase 3 (Optimierung - 4 Wochen)
- 📋 Android-Support
- 📋 Cloud-Synchronisation
- 📋 Social Features (Rezepte teilen)
- 📋 Erweiterte Statistiken

### 9. Risiken und Abhängigkeiten

#### 9.1 Technische Risiken
- **API-Limits**: Google Gemini API Kosten/Limits
- **Nährstoffdaten**: Genauigkeit und Verfügbarkeit
- **Expo-Limitierungen**: Mögliche Einschränkungen mit HealthKit
- **Health-Berechtigungen**: Nutzer könnte Health-Zugriff verweigern
- **iOS-Updates**: HealthKit API Änderungen

#### 9.2 Abhängigkeiten
- Google Gemini API Verfügbarkeit
- Apple App Store Richtlinien
- Apple HealthKit Verfügbarkeit und Richtlinien
- Nährstoffdatenbank-Lizenzen
- Expo HealthKit Plugin Stabilität

### 10. Budget und Ressourcen

#### 10.1 Entwicklungskosten (Schätzung)
- **Entwicklung**: 40-60 Stunden
- **Google Gemini API**: ~$20-50/Monat (abhängig von Nutzung)
- **Apple Developer Account**: $99/Jahr
- **Nährstoffdatenbank**: $0-30/Monat

#### 10.2 Laufende Kosten
- API-Kosten: $30-100/Monat (bei 1000 aktiven Nutzern)
- App Store Gebühren: $99/Jahr
- Hosting (optional): $10-20/Monat

---

**Erstellt**: 2025-01-21  
**Version**: 1.0  
**Status**: Draft