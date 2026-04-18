# 🌳 OrchardLog / Sadownik+ — Założenia projektu

## 📌 Nazwa aplikacji

- **Wersja robocza / techniczna:** OrchardLog
- **Wersja dla użytkowników PL:** Sadownik+

---

## 🎯 Cel aplikacji

Aplikacja ma wspierać sadowników w zarządzaniu sadem poprzez:

- ewidencję działek i drzew,
- śledzenie prac i ich postępu,
- prowadzenie dziennika działań w ciągu całego roku,
- przechowywanie wiedzy o odmianach drzew.

---

## 🧠 Główna idea

System typu:

> **Orchard Management + Field Journal + Knowledge Base**

Użytkownik ma pełną kontrolę nad:

- tym co posiada (działki, drzewa),
- tym co robi (prace, zabiegi),
- tym co wie (odmiany, notatki, doświadczenia).

---

## 🧱 Główne funkcjonalności (MVP)

### 1. Zarządzanie działkami

- dodawanie działek
- nazwa, lokalizacja, powierzchnia
- możliwość podziału na sekcje (opcjonalnie w przyszłości)

---

### 2. Zarządzanie drzewami

- przypisanie drzewa do działki
- informacje:
  - gatunek (np. jabłoń, grusza)
  - odmiana
  - data posadzenia
  - stan / kondycja
- możliwość grupowania (np. rzędy)

---

### 3. Odmiany (baza wiedzy)

- nazwa odmiany
- opis
- wymagania pielęgnacyjne
- cechy charakterystyczne
- notatki użytkownika

---

### 4. Dziennik prac (kluczowa funkcjonalność)

- zapisywanie zdarzeń:
  - oprysk
  - przycinanie
  - nawożenie
  - podlewanie
  - inne
- informacje:
  - data
  - działka / drzewo
  - opis
  - użyte środki
- historia działań (timeline)

---

### 5. Śledzenie postępu

- podgląd:
  - co zostało zrobione
  - co jest do zrobienia
- filtrowanie po:
  - działce
  - drzewie
  - czasie

---

### 6. Sezonowość

- możliwość zapisywania danych przez cały rok
- podział na sezony (opcjonalnie):
  - wiosna
  - lato
  - jesień
  - zima

---

## 🧩 Wstępny model danych (high-level)

- **Plot (Działka)**
- **Tree (Drzewo)**
- **Variety (Odmiana)**
- **Activity (Zdarzenie / Praca)**
- **Season (Sezon)**

Relacje:

- działka → wiele drzew
- drzewo → jedna odmiana
- drzewo → wiele zdarzeń
- działka → wiele zdarzeń

---

## 📱 Platforma

Docelowo:

- aplikacja mobilna + webowa (hybrydowa)

---

## 🚀 Kierunek rozwoju (po MVP)

- przypomnienia o pracach
- analiza historii (np. plony vs działania)
- zdjęcia drzew / chorób
- mapy działek
- integracja z pogodą

---

## 📝 Notatki

Projekt ma być:

- prosty w użyciu dla sadownika
- szybki w dodawaniu danych (minimalny friction)
- rozszerzalny w przyszłości

---
