# OrchardLog / Sadownik+ - local dev tools quickstart

## Cel

Ten plik jest praktyczna sciaga do lokalnej pracy z narzedziami:

- `node`
- `pnpm`
- `docker`
- `supabase`

Ma zmniejszyc stres przed uruchamianiem komend.
Priorytetem jest prosty model:

- co jest bezpieczne do odpalania,
- co tylko sprawdza stan,
- co zmienia projekt,
- co warto uruchamiac najczesciej.

## Zasada ogolna

Najbezpieczniejszy podzial komend:

- `read-only`:
  - nic nie zmieniaja, tylko pokazuja stan
- `local project state`:
  - zmieniaja lokalne kontenery, cache albo lokalna baze developerska
- `project files`:
  - zmieniaja pliki repo, migracje albo lockfile

Jesli chcesz pracowac spokojnie, zaczynaj od komend `read-only`.

## 1. Aktualnie wykryte narzedzia

Na tym komputerze narzedzia sa zainstalowane:

- `node v25.8.1`
- `pnpm 10.15.1`
- `docker 29.3.0`
- `supabase 2.90.0`

## 2. Mental model - czego sie nie bac

Bezpieczne komendy diagnostyczne:

- `node --version`
- `pnpm --version`
- `docker --version`
- `supabase --version`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `supabase status`
- `docker ps`

To sa komendy, ktore normalnie nie psuja projektu.
Najwyzej powiedza Ci, ze czegos brakuje albo cos nie dziala.

Komendy, ktore zmieniaja tylko lokalne srodowisko developerskie:

- `pnpm install`
- `supabase start`
- `supabase stop`
- `supabase db reset`
- `docker compose up`
- `docker compose down`

One nie powinny popsuc repo, ale moga:

- pobrac obrazy,
- postawic kontenery,
- przebudowac lokalna baze,
- nadpisac lokalne dane developerskie.

Komendy, przy ktorych trzeba myslec uwazniej:

- `supabase db reset`
- `supabase migration up`
- `pnpm add ...`
- `pnpm remove ...`

One zmieniaja albo baze lokalna, albo pliki projektu.

## 3. Najkrotszy bezpieczny workflow

Jesli chcesz tylko wejsc do projektu i niczego nie zepsuc:

```bash
node --version
pnpm --version
supabase --version
docker --version
```

Jesli chcesz odpalic projekt lokalnie:

```bash
pnpm install
supabase start
pnpm dev
```

Potem otworz aplikacje w przegladarce:

- `http://localhost:3000`

Jesli aplikacja uruchomila sie poprawnie, w terminalu po `pnpm dev` powinienes zobaczyc adres lokalny, najczesciej:

- `Local: http://localhost:3000`

Jesli chcesz tylko sprawdzic, czy wszystko zyje:

```bash
supabase status
docker ps
```

Jesli chcesz zatrzymac lokalny stack:

```bash
supabase stop
```

## 4. `node` - po co jest i co odpalac

`node` uruchamia runtime dla Next.js, narzedzi developerskich i skryptow JS/TS.

Najczestsze komendy:

```bash
node --version
node -p "process.version"
```

Kiedy uzywasz:

- sprawdzenie, czy runtime istnieje
- debug prostych rzeczy
- uruchamianie narzedzi, ktore sa pod spodem wywolywane przez `pnpm`

Na co uwazac:

- nie odpalaj losowych skryptow `node some-file.js`, jesli nie wiesz co robia
- w codziennej pracy zwykle wystarczy Ci `pnpm`, nie surowy `node`

## 5. `pnpm` - glowny menedzer projektu

`pnpm` sluzy do:

- instalacji zaleznosci
- uruchamiania skryptow z `package.json`
- dodawania lub usuwania paczek

Najwazniejsze komendy:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

Znaczenie:

- `pnpm install`
  - pobiera zaleznosci
  - aktualizuje `node_modules`
  - moze zaktualizowac lockfile, jesli zaleznosci sie zmienily
- `pnpm dev`
  - odpala aplikacje developersko
  - to jest normalna, bezpieczna komenda do pracy
- `pnpm build`
  - sprawdza, czy projekt przechodzi produkcyjny build
- `pnpm lint`
  - sprawdza jakosc kodu
- `pnpm typecheck`
  - sprawdza typy TypeScript
- `pnpm test`
  - uruchamia testy automatyczne projektu
  - dla testow integracyjnych wymaga dzialajacego lokalnego Supabase

Najbezpieczniejszy zestaw po zmianach:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Kiedy uwazac:

```bash
pnpm add <package>
pnpm remove <package>
```

To zmienia zaleznosci projektu.

## 6. `docker` - kontenery lokalne

W tym projekcie `docker` jest glownie potrzebny dlatego, ze lokalny stack `supabase` dziala na kontenerach.

Najwazniejsze komendy:

```bash
docker --version
docker ps
docker ps -a
docker logs <container_name>
```

Znaczenie:

- `docker ps`
  - pokazuje dzialajace kontenery
- `docker ps -a`
  - pokazuje wszystkie kontenery, takze zatrzymane
- `docker logs <container_name>`
  - pokazuje logi konkretnego kontenera

Przykladowe bezpieczne diagnozy:

```bash
docker ps
docker logs supabase_db_Orchard_v3
```

Komendy bardziej „stanotworcze”:

```bash
docker stop <container_name>
docker start <container_name>
docker rm <container_name>
```

Ich nie odpalaj bez potrzeby, jesli nie wiesz, po co to robisz.

## 7. `supabase` - najwazniejsze lokalnie

To jest Twoje glowne CLI do lokalnej bazy, auth i migracji.

Najczesciej uzywane komendy:

```bash
supabase start
supabase status
supabase stop
supabase db reset
```

Znaczenie:

- `supabase start`
  - stawia lokalny stack Supabase w Dockerze
  - uruchamia lokalna baze, Studio, API i pozostale serwisy
- `supabase status`
  - pokazuje, czy stack dziala i na jakich portach
- `supabase stop`
  - zatrzymuje lokalny stack
- `supabase db reset`
  - resetuje lokalna baze
  - odpala migracje od nowa
  - zwykle seeduje dane, jesli projekt jest tak skonfigurowany

Najbezpieczniejszy codzienny zestaw:

```bash
supabase status
supabase start
supabase stop
```

Komenda, przy ktorej trzeba miec swiadomosc:

```bash
supabase db reset
```

To jest bezpieczne dla lokalnego developmentu, ale:

- usuwa lokalne dane developerskie,
- odtwarza schema od zera,
- moze zrestartowac Ci caly lokalny stan testowy.

## 8. Polecany workflow dla tego repo

### Pierwsze wejscie

```bash
pnpm install
supabase start
pnpm dev
```

Potem w przegladarce otworz:

- `http://localhost:3000`

Jesli chcesz podgladac baze i Auth w Supabase Studio, otworz:

- `http://127.0.0.1:54323`

### Sprawdzenie, czy projekt jest zdrowy

```bash
pnpm lint
pnpm typecheck
pnpm test
supabase status
```

Jesli sama aplikacja ma sie uruchomic i byc widoczna w przegladarce, najwazniejsza komenda jest:

```bash
pnpm dev
```

### Po zmianach w migracjach

```bash
supabase db reset
supabase status
```

### Po wiekszej zmianie w aplikacji

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Gdy chcesz widziec pelniejsze logi testow

```bash
pnpm test -- --reporter=verbose
```

Jesli chcesz zapisac log testow do pliku:

```bash
pnpm test -- --reporter=verbose 2>&1 | tee vitest.log
```

Wtedy log znajdziesz w pliku:

- `vitest.log`

Wazne:

- w aktualnym repo jest skrypt `pnpm test`
- domyslnie logi testow sa wypisywane tylko w terminalu, nie zapisuja sie automatycznie do osobnego pliku

## 9. Jak myslec o `supabase db reset`

To nie jest „straszna” komenda.
Dla developmentu to jest normalne narzedzie do:

- odtworzenia bazy,
- sprawdzenia migracji od zera,
- upewnienia sie, ze seed dziala.

Najprostsza zasada:

- jesli testujesz migracje albo seed, `supabase db reset` jest OK
- jesli masz lokalne dane, ktorych nie chcesz stracic, najpierw sie zatrzymaj

## 10. Jak sprawdzac, czy localhost dziala

Najczestsze lokalne punkty:

- aplikacja Next.js:
  - zwykle `http://localhost:3000`
- Supabase Studio:
  - zwykle `http://127.0.0.1:54323`
  - albo `http://localhost:54323`

Do szybkiej diagnozy:

```bash
supabase status
curl -I http://127.0.0.1:54323
curl -I http://localhost:54323
```

Jesli `supabase status` pokazuje dzialajace uslugi, a przegladarka dziala, to wszystko jest w porzadku.

Najprostszy test aplikacji:

1. uruchom `pnpm dev`
2. wejdz na `http://localhost:3000`
3. sprawdz, czy laduje sie strona logowania, rejestracji albo redirect aplikacji

## 11. Komendy, ktore polecam Ci zapamietac

Minimalne:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
supabase start
supabase status
supabase stop
supabase db reset
docker ps
```

## 12. Szybka sciaga - 5 komend na start dnia

```bash
node --version
pnpm --version
supabase status
docker ps
pnpm dev
```

Po co:

- sprawdzasz, czy runtime i narzedzia zyja
- widzisz, czy lokalny stack Supabase jest uruchomiony
- odpalasz aplikacje developersko

## 13. Szybka sciaga - 5 komend do sprawdzenia czy wszystko dziala

```bash
supabase status
docker ps
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Po co:

- potwierdzasz dzialanie lokalnych uslug
- sprawdzasz jakosc kodu
- sprawdzasz typy
- sprawdzasz, czy aplikacja sklada sie produkcyjnie

## 14. Szybka sciaga - 5 komend, ktorych uzywac ostroznie

```bash
supabase db reset
pnpm add <package>
pnpm remove <package>
docker stop <container_name>
docker rm <container_name>
```

Dlaczego ostroznie:

- `supabase db reset`
  - usuwa lokalny stan bazy i buduje go od nowa
- `pnpm add` / `pnpm remove`
  - zmieniaja zaleznosci projektu
- `docker stop` / `docker rm`
  - zmieniaja stan lokalnych kontenerow i moga zatrzymac uslugi, na ktorych pracujesz

## 15. Co zostalo zweryfikowane teraz

Zweryfikowane lokalnie z tego srodowiska:

- `node` jest zainstalowany
- `pnpm` jest zainstalowany
- `docker` jest zainstalowany
- `supabase` jest zainstalowany

Ograniczenia tej sesji:

- nie mam pelnego dostepu do Twojego lokalnego Dockera z tego sandboxa
- dlatego nie moge wiarygodnie potwierdzic `docker ps` ani `supabase status`
- probe `curl` pod `localhost:54323` z tej sesji nie udalo sie nawiazac

To nie musi znaczyc, ze u Ciebie to nie dziala.
Jesli Ty widzisz Supabase Studio w przegladarce, to lokalny stack najpewniej jest uruchomiony poprawnie.

## 16. Najprostsza rekomendacja na teraz

Jesli chcesz spokojnie sprawdzic wszystko sam:

```bash
supabase status
docker ps
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

To jest dobry, bezpieczny zestaw startowy do codziennej pracy.
