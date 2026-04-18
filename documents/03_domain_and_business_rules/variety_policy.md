# OrchardLog / Sadownik+ - polityka odmian

## Cel dokumentu

Ten dokument opisuje, jak traktujemy odmiany w MVP i jak przygotowujemy model pod przyszly rozwoj.

## 1. Zalozenie na MVP

- Odmiany sa prywatne per `orchard`.
- Kazdy `orchard` buduje wlasna baze wiedzy o odmianach.
- Ta sama nazwa odmiany moze wystepowac w wielu orchard jako osobne rekordy.

## 2. Dlaczego taka decyzja

- upraszcza model autoryzacji i RLS
- wspiera wspolprace `owner + worker` wewnatrz jednego orchard
- eliminuje problem globalnej wspoldzielonej edycji
- pozwala trzymac notatki praktyczne i lokalne dla konkretnego gospodarstwa

## 3. Zasady unikalnosci

- W obrebie jednego `orchard` unikalne jest polaczenie:
  - `species`
  - `name`
- Dopuszczalne sa podobne odmiany o tej samej nazwie w innych orchard.

## 4. Powiazanie z drzewami

- Jedna odmiana moze byc przypisana do wielu drzew tego samego `orchard`.
- Drzewo moze istniec bez przypisanej odmiany.
- Jesli odmiana jest przypisana do drzewa, musi nalezec do tego samego `orchard`.

## 5. Zawartosc rekordu odmiany

Odmiana moze przechowywac:

- gatunek
- nazwe
- opis
- zalecenia pielegnacyjne
- cechy charakterystyczne
- okres dojrzewania
- informacje o odpornosci
- kraj pochodzenia
- notatki ulubione / robocze

## 6. Operacje na odmianach

### Dozwolone w MVP

- tworzenie
- edycja
- wyszukiwanie
- filtrowanie
- przypisywanie do drzew

### Operacje wymagajace ostroznosci

- usuwanie odmiany powiazanej z drzewami

### Rekomendacja

- W UI blokowac albo mocno utrudniac usuwanie odmiany, jesli jest przypisana do drzew.
- Lepiej wspierac edycje albo odpinanie odmiany od drzew niz twarde usuwanie.

## 7. Kierunek rozwoju po MVP

Mozliwy przyszly model:

- odmiany systemowe globalne
- odmiany prywatne orchard
- kopiowanie odmiany globalnej do prywatnej bazy orchard

Na obecnym etapie tego nie wdrazamy.

## 8. Decyzje przyjete teraz

- W MVP nie tworzymy katalogu publicznych odmian.
- W MVP nie przewidujemy wspoldzielonej edycji odmian miedzy orchard.
- `worker` moze tworzyc i edytowac odmiany w aktywnym orchard.
- Szczegoly odmiany maja byc jednoczesnie baza wiedzy i punktem wejscia do pracy z drzewami tej odmiany.
