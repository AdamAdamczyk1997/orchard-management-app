# OrchardLog / Sadownik+ - backup, restore i export

## Cel dokumentu

Ten dokument opisuje, jak myslec o bezpieczenstwie danych i odzyskiwaniu po awarii.

## 1. Zasada glowna

Dane o sadzie maja wartosc operacyjna i historyczna.
Utrata danych moze byc bardzo kosztowna, dlatego backup i eksport nie sa dodatkiem, tylko warstwa bezpieczenstwa produktu.

## 2. Backup systemowy

### Rekomendacja

- korzystac z mechanizmow backupowych dostarczanych przez infrastrukture bazy
- regularnie sprawdzac, czy backupy sa wykonywane i odzyskiwalne

### Zakres

- baza danych
- w przyszlosci storage z zalacznikami

## 3. Export konta

### Cel

- dac userowi mozliwosc pobrania swoich danych
- ograniczyc ryzyko vendor lock-in

### Zasady

- eksport jest `account-wide`
- eksport moze wykonac tylko `owner` albo `super_admin`
- eksport obejmuje wszystkie orchard, dla ktorych user ma aktywne membership `owner`
- orchard, w ktorym user jest tylko `worker`, nie jest eksportowany

### Zakres minimalny

- `profile`
- `orchards`
- `orchard_memberships`
- `plots`
- `trees`
- `varieties`
- `activities`
- `activity_scopes`
- `activity_materials`
- `harvest_records`

## 4. Restore

### Poziomy odzyskiwania

- odzyskanie calej bazy po awarii
- odzyskanie danych z eksportu konta
- w przyszlosci odzyskanie pojedynczych zalacznikow

### Zasady

- restore musi byc wykonywany ostroznie i najlepiej na kopii lub srodowisku testowym
- przed restore wart miec migawke aktualnego stanu
- restore z eksportu musi zachowac spojnosc `orchard_id` i membership

## 5. Decyzja etapowa

- w 0.1 najwazniejszy jest backup infrastrukturalny i techniczny eksport danych
- w 0.2 eksport powinien byc dostepny takze dla `owner` z UI

## 6. Co warto przetestowac

- czy eksport JSON zawiera komplet glownych danych
- czy da sie odtworzyc dane z eksportu w srodowisku testowym
- czy backup bazy jest rzeczywiscie wykonywany zgodnie z planem
- czy eksport nie obejmuje orchard, w ktorych user ma tylko role `worker`
