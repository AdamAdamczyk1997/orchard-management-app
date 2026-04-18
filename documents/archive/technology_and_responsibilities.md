# 🌳 OrchardLog / Sadownik+ — Architektura i technologie

## 📌 Przyjęty stack technologiczny

### Frontend

- **Next.js**
- **React**
- **TypeScript**

### Backend / Baza danych

- **PostgreSQL**
- **Supabase (BaaS)**

### Autoryzacja

- **Supabase Auth**

### Storage (pliki, zdjęcia)

- **Supabase Storage**

### Import / Export danych

- **Markdown + YAML (front matter)**
- **JSON**
- **CSV (opcjonalnie dla raportów)**

---

## 🎯 Cel architektury

Zbudowanie aplikacji webowej dostępnej przez przeglądarkę:

- działającej na telefonie i laptopie,
- z systemem kont użytkowników,
- przechowującej dane w chmurze,
- umożliwiającej import/export danych w formie plików tekstowych.

---

## 🧱 Główne założenia architektoniczne

1. **Web-first approach**
   - brak aplikacji desktopowej na start
   - dostęp przez przeglądarkę

2. **Dane przypisane do użytkownika**
   - każdy użytkownik widzi tylko swoje działki, drzewa i dane

3. **Relacyjna baza danych**
   - PostgreSQL jako główne źródło danych

4. **Pliki jako warstwa pomocnicza**
   - import danych
   - eksport
   - backup
   - edycja offline (opcjonalnie)

---

## 🧩 Podział odpowiedzialności

### 1. Frontend (Next.js + React)

Odpowiada za:

- UI / UX aplikacji
- nawigację między ekranami
- formularze (dodawanie/edycja danych)
- filtrowanie i wyszukiwanie
- wizualizację danych

#### Główne widoki:

- Dashboard
- Lista działek
- Szczegóły działki
- Lista drzew
- Szczegóły drzewa
- Baza odmian
- Dziennik prac
- Widok sezonowy / kalendarz

---

### 2. Backend (Supabase)

#### PostgreSQL (baza danych)

Odpowiada za:

- użytkowników
- działki (plots)
- drzewa (trees)
- odmiany (varieties)
- zdarzenia/prace (activities)
- relacje między encjami

#### Supabase API

- automatyczne API do komunikacji z bazą
- operacje CRUD

---

### 3. Autoryzacja (Supabase Auth)

Odpowiada za:

- rejestrację użytkownika
- logowanie
- sesję użytkownika
- reset hasła
- kontrolę dostępu do danych

#### Kluczowe założenie:

- każdy użytkownik ma dostęp tylko do swoich danych (Row Level Security)

---

### 4. Storage (Supabase Storage)

Odpowiada za:

- zdjęcia drzew
- załączniki (np. dokumenty, notatki)
- potencjalne pliki eksportu

---

### 5. Import / Export (warstwa plikowa)

#### Markdown + YAML (zalecane)

Używane do:

- opisów odmian
- notatek o drzewach
- wiedzy eksperckiej

Przykład:

```md
---
type: variety
name: ligol
species: jablon
---

# Ligol

Odmiana odporna na chłód, wymaga regularnego cięcia.
```
