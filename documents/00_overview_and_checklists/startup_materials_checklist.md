# Checklista materialow i wytycznych potrzebnych do sprawnej budowy OrchardLog / Sadownik+

Ta lista jest dopasowana do dokumentow, ktore juz sa w projekcie.
Checkbox zaznaczony oznacza, ze temat jest juz co najmniej wstepnie opisany.
Checkbox pusty oznacza, ze ten material nadal warto doprecyzowac lub dopisac, zeby implementacja byla szybsza, bezpieczniejsza i mniej zgadywana.

Wazne:
dokumenty z `documents/archive/` zachowujemy jako kontekst historyczny, ale nie traktujemy ich jako normatywnego source of truth do implementacji.

## 1. Materialy, ktore juz mamy

- [x] `high_level_plan.md` jako dokument historyczny z celem produktu i wczesnym szkicem zakresu
  Lokalizacja: [`documents/archive/high_level_plan.md`](../archive/high_level_plan.md)
- [x] `technology_and_responsibilities.md` jako dokument historyczny z wczesnym opisem stacku
  Lokalizacja: [`documents/archive/technology_and_responsibilities.md`](../archive/technology_and_responsibilities.md)
- [x] `orchardlog_database_model.md` z glownymi encjami, relacjami i propozycja tabel
  Lokalizacja: [`documents/03_domain_and_business_rules/orchardlog_database_model.md`](../03_domain_and_business_rules/orchardlog_database_model.md)
- [x] `orchardlog_data_model_location_and_variety_reports_update.md` jako historyczny material przejsciowy pod lokalizacje drzew i raporty odmianowe
  Lokalizacja: [`documents/archive/orchardlog_data_model_location_and_variety_reports_update.md`](../archive/orchardlog_data_model_location_and_variety_reports_update.md)

## 2. Materialy, ktore najbardziej pomoga wejsc w implementacje

- [x] `local_dev_tools_quickstart.md`
  Lokalizacja: [`documents/00_overview_and_checklists/local_dev_tools_quickstart.md`](./local_dev_tools_quickstart.md)
  Praktyczna sciaga do lokalnej pracy z `node`, `pnpm`, `docker` i `supabase`, z podzialem na komendy bezpieczne diagnostycznie i komendy zmieniajace lokalny stan projektu.

- [x] `mvp_scope_and_priorities.md`
  Lokalizacja: [`documents/02_product_documents/mvp_scope_and_priorities.md`](../02_product_documents/mvp_scope_and_priorities.md)
  Co ma wejsc do wersji 0.1, co do 0.2, a co zostaje poza MVP.
- [x] `user_flows.md`
  Lokalizacja: [`documents/01_implementation_materials/user_flows.md`](../01_implementation_materials/user_flows.md)
  Najwazniejsze scenariusze krok po kroku:
  rejestracja, dodanie dzialki, dodanie drzewa, wpis do dziennika, zapis zbioru oraz flow etapu `0.2` dla batch create, bulk deactivate i raportu lokalizacji odmiany.
- [x] `business_rules.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/business_rules.md`](../03_domain_and_business_rules/business_rules.md)
  Jedno miejsce na twarde reguly biznesowe, zeby nie byly porozrzucane po kilku plikach.
- [x] `screens_and_views.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/screens_and_views.md`](../04_ux_and_screen_design/screens_and_views.md)
  Lista ekranow i co ma sie na nich znajdowac.
- [x] `api_and_system_operations.md`
  Lokalizacja: [`documents/06_backend_and_contracts/api_and_system_operations.md`](../06_backend_and_contracts/api_and_system_operations.md)
  Lista operacji, ktore musi obslugiwac aplikacja i backend.
- [x] `mvp_acceptance_criteria.md`
  Lokalizacja: [`documents/07_security_and_quality/mvp_acceptance_criteria.md`](../07_security_and_quality/mvp_acceptance_criteria.md)
  Po czym poznajemy, ze funkcja jest gotowa i dziala poprawnie.

## 3. Pliki produktowe, ktore bym chcial miec

- [x] `high_level_plan.md`
  Lokalizacja: [`documents/archive/high_level_plan.md`](../archive/high_level_plan.md)
  Powinien zawierac:
  cel systemu, typy uzytkownikow, zakres MVP, glowne moduly, kierunek po MVP.
- [x] `personas_and_user_types.md`
  Lokalizacja: [`documents/02_product_documents/personas_and_user_types.md`](../02_product_documents/personas_and_user_types.md)
  Potrzebne dane:
  kim jest glowny uzytkownik, jak korzysta z telefonu i komputera, jak czesto wprowadza dane, jaki ma poziom techniczny, co najbardziej go boli w obecnym sposobie pracy.
- [x] `glossary.md`
  Lokalizacja: [`documents/02_product_documents/glossary.md`](../02_product_documents/glossary.md)
  Potrzebne dane:
  definicje pojec takich jak dzialka, sekcja, rzad, pozycja, drzewo, odmiana, aktywnosc, sezon, batch, lokalizacja potwierdzona.
- [x] `mvp_scope_and_priorities.md`
  Lokalizacja: [`documents/02_product_documents/mvp_scope_and_priorities.md`](../02_product_documents/mvp_scope_and_priorities.md)
  Potrzebne dane:
  funkcje oznaczone jako `must have`, `should have`, `later`, plus uzasadnienie.
- [x] `user_goals_and_success_metrics.md`
  Lokalizacja: [`documents/02_product_documents/user_goals_and_success_metrics.md`](../02_product_documents/user_goals_and_success_metrics.md)
  Potrzebne dane:
  co ma byc szybkie, co ma byc proste, ile klikniec jest akceptowalne, jakie zadania uzytkownik wykonuje najczesciej.

## 4. Pliki domenowe i reguly biznesowe

- [x] `orchardlog_database_model.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/orchardlog_database_model.md`](../03_domain_and_business_rules/orchardlog_database_model.md)
  Mamy:
  glowny model encji, pola, relacje, ograniczenia i indeksy.
- [x] `orchardlog_data_model_location_and_variety_reports_update.md`
  Lokalizacja: [`documents/archive/orchardlog_data_model_location_and_variety_reports_update.md`](../archive/orchardlog_data_model_location_and_variety_reports_update.md)
  Mamy:
  rozszerzenie modelu pod rzedy, pozycje, sekcje i hurtowe tworzenie drzew.
- [x] `business_rules.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/business_rules.md`](../03_domain_and_business_rules/business_rules.md)
  Potrzebne dane:
  kiedy drzewo mozna oznaczyc jako usuniete, czy aktywnosc `planned` moze byc bez daty wykonania, czy mozna edytowac historyczne wpisy, jak liczyc sezon, czy jedna odmiana moze byc prywatna i globalna jednoczesnie.
- [x] `statuses_and_lifecycles.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/statuses_and_lifecycles.md`](../03_domain_and_business_rules/statuses_and_lifecycles.md)
  Potrzebne dane:
  pelna lista statusow dla dzialek, drzew, aktywnosci i batchy oraz dozwolone przejscia miedzy statusami.
- [x] `validations_and_integrity.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/validations_and_integrity.md`](../03_domain_and_business_rules/validations_and_integrity.md)
  Potrzebne dane:
  ktore reguly pilnujemy w UI, ktore w bazie, ktore w serwerowych akcjach lub API.
- [x] `tree_location_policy.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/tree_location_policy.md`](../03_domain_and_business_rules/tree_location_policy.md)
  Potrzebne dane:
  kiedy `row_number` i `position_in_row` sa wymagane, kiedy wystarczy `section_name`, jak interpretujemy nieregularne dzialki.
- [x] `variety_policy.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/variety_policy.md`](../03_domain_and_business_rules/variety_policy.md)
  Potrzebne dane:
  czy odmiany sa prywatne tylko per `orchard`, czy planujemy odmiany systemowe, jak rozwiazujemy duplikaty nazw i gatunkow.

## 5. Pliki pod UX i projekt ekranow

- [x] `screens_and_views.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/screens_and_views.md`](../04_ux_and_screen_design/screens_and_views.md)
  Potrzebne dane:
  dashboard, lista dzialek, szczegoly dzialki, lista drzew, szczegoly drzewa, baza odmian, dziennik prac, formularz batchowego dodawania drzew, widok raportu odmianowego.
- [x] `navigation_map.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/navigation_map.md`](../04_ux_and_screen_design/navigation_map.md)
  Potrzebne dane:
  skad uzytkownik przechodzi dokad, jakie sa glowne sciezki i skroty.
- [x] `forms_and_fields.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/forms_and_fields.md`](../04_ux_and_screen_design/forms_and_fields.md)
  Potrzebne dane:
  wszystkie formularze, pola wymagane, pola opcjonalne, placeholdery, walidacje, podpowiedzi, wartosci domyslne.
- [x] `ui_states.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/ui_states.md`](../04_ux_and_screen_design/ui_states.md)
  Potrzebne dane:
  loading, empty state, success, validation error, konflikt danych, brak wynikow filtrowania, brak potwierdzonej lokalizacji.
- [x] `ui_copy_and_terminology.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/ui_copy_and_terminology.md`](../04_ux_and_screen_design/ui_copy_and_terminology.md)
  Potrzebne dane:
  jakich nazw uzywamy w interfejsie po polsku, zeby byly spojne i zrozumiale dla sadownika.
- [x] `mobile_first_guidelines.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/mobile_first_guidelines.md`](../04_ux_and_screen_design/mobile_first_guidelines.md)
  Potrzebne dane:
  ktore akcje musza byc bardzo szybkie w telefonie w sadzie, a ktore moga byc wygodniejsze na desktopie.

## 6. Pliki techniczne potrzebne do implementacji

- [x] `technology_and_responsibilities.md`
  Lokalizacja: [`documents/archive/technology_and_responsibilities.md`](../archive/technology_and_responsibilities.md)
  Mamy:
  Next.js, React, TypeScript, PostgreSQL, Supabase Auth, Supabase Storage, import/export.
- [x] `application_architecture.md`
  Lokalizacja: [`documents/05_technical/application_architecture.md`](../05_technical/application_architecture.md)
  Potrzebne dane:
  proponowana struktura aplikacji, np. `app/`, moduly domenowe, warstwa danych, serwerowe akcje, komponenty, formularze, walidacja.
- [x] `project_conventions.md`
  Lokalizacja: [`documents/05_technical/project_conventions.md`](../05_technical/project_conventions.md)
  Potrzebne dane:
  nazewnictwo plikow, nazewnictwo tabel i typow, styl TypeScript, podejscie do komponentow, formularzy i error handlingu.
- [x] `state_and_data_fetching_strategy.md`
  Lokalizacja: [`documents/05_technical/state_and_data_fetching_strategy.md`](../05_technical/state_and_data_fetching_strategy.md)
  Potrzebne dane:
  co czytamy bezposrednio z Supabase, co przez server actions, jak robimy cache, refetch i optimistic update.
- [x] `authorization_and_rls_strategy.md`
  Lokalizacja: [`documents/05_technical/authorization_and_rls_strategy.md`](../05_technical/authorization_and_rls_strategy.md)
  Potrzebne dane:
  konkretne zasady dostepu do `profiles`, `plots`, `trees`, `varieties`, `activities`, `activity_materials`, `bulk_tree_import_batches`.
- [x] `schema_migration_plan.md`
  Lokalizacja: [`documents/05_technical/schema_migration_plan.md`](../05_technical/schema_migration_plan.md)
  Potrzebne dane:
  kolejnosc migracji, constraints, indexy, seed danych testowych.
- [x] `storage_and_attachments.md`
  Lokalizacja: [`documents/05_technical/storage_and_attachments.md`](../05_technical/storage_and_attachments.md)
  Potrzebne dane:
  czy w MVP trzymamy zdjecia drzew, jakie bucket'y, limity rozmiaru, typy plikow, nazewnictwo sciezek.

## 7. Pliki backendowe i kontrakty operacji

- [x] `api_and_system_operations.md`
  Lokalizacja: [`documents/06_backend_and_contracts/api_and_system_operations.md`](../06_backend_and_contracts/api_and_system_operations.md)
  Potrzebne dane:
  tworzenie, edycja i archiwizacja dzialek, drzew, odmian i aktywnosci; batch create trees; filtrowanie historii; raport lokalizacji odmiany; import i export.
- [x] `data_contracts.md`
  Lokalizacja: [`documents/06_backend_and_contracts/data_contracts.md`](../06_backend_and_contracts/data_contracts.md)
  Potrzebne dane:
  shape requestow i response'ow dla formularzy i operacji serwerowych.
- [x] `errors_and_system_messages.md`
  Lokalizacja: [`documents/06_backend_and_contracts/errors_and_system_messages.md`](../06_backend_and_contracts/errors_and_system_messages.md)
  Potrzebne dane:
  lista przewidywanych bledow biznesowych i technicznych oraz komunikaty dla uzytkownika.
- [x] `import_export_spec.md`
  Lokalizacja: [`documents/06_backend_and_contracts/import_export_spec.md`](../06_backend_and_contracts/import_export_spec.md)
  Potrzebne dane:
  jakie formaty wspieramy w MVP, jakie kolumny CSV, jaki schemat JSON, jak wyglada Markdown z front matter dla odmian i notatek.
- [x] `batch_tree_creation_rules.md`
  Lokalizacja: [`documents/06_backend_and_contracts/batch_tree_creation_rules.md`](../06_backend_and_contracts/batch_tree_creation_rules.md)
  Potrzebne dane:
  co robimy przy konflikcie lokalizacji, jak generujemy `tree_code`, czy wolno pominac zajete pozycje, jak raportujemy wynik batcha.

## 8. Pliki pod bezpieczenstwo i jakosc

- [x] `test_plan.md`
  Lokalizacja: [`documents/07_security_and_quality/test_plan.md`](../07_security_and_quality/test_plan.md)
  Potrzebne dane:
  co testujemy jednostkowo, integracyjnie i e2e, jakie krytyczne scenariusze musza byc pokryte.
- [x] `mvp_acceptance_criteria.md`
  Lokalizacja: [`documents/07_security_and_quality/mvp_acceptance_criteria.md`](../07_security_and_quality/mvp_acceptance_criteria.md)
  Potrzebne dane:
  osobne kryteria dla dzialek, drzew, odmian, aktywnosci, batchy i raportu odmianowego.
- [x] `security_and_privacy.md`
  Lokalizacja: [`documents/07_security_and_quality/security_and_privacy.md`](../07_security_and_quality/security_and_privacy.md)
  Potrzebne dane:
  czy aplikacja przechowuje wyrazliwe dane, jakie logi wolno trzymac, jak wyglada retencja danych i eksport danych uzytkownika.
- [x] `backup_restore_and_export.md`
  Lokalizacja: [`documents/07_security_and_quality/backup_restore_and_export.md`](../07_security_and_quality/backup_restore_and_export.md)
  Potrzebne dane:
  jak wykonujemy backup, co uzytkownik moze wyeksportowac sam, jak odzyskac dane po bledzie.
- [x] `monitoring_and_observability.md`
  Lokalizacja: [`documents/07_security_and_quality/monitoring_and_observability.md`](../07_security_and_quality/monitoring_and_observability.md)
  Potrzebne dane:
  jakie bledy logujemy, jak oznaczamy krytyczne akcje, jakie metryki beda potrzebne po wdrozeniu.

## 9. Najwazniejsze pytania zamkniete na obecnym etapie

- [x] MVP na start jest projektowane tylko po polsku.
- [x] Odmiany w MVP sa prywatne per `orchard`.
- [x] Aktywnosci planowane i wykonane siedza w tej samej tabeli i korzystaja z jednego formularza.
- [x] Drzewo bez znanej odmiany moze byc zapisane i uzupelnione pozniej.
- [x] Batchowe dodawanie drzew jest funkcja etapu 0.2.
- [x] Raport "gdzie jest dana odmiana" jest funkcja etapu 0.2, a nie obowiazkowym elementem wydania 0.1.
- [x] Sekcje / kwatery sa na start zwyklym polem tekstowym `section_name`.
- [x] W wersji 0.1 nie przewidujemy zdjec drzew ani zalacznikow do aktywnosci.
- [x] Dziennik prac obsluguje wpisy historyczne i planowane.
- [x] Export / import w 0.1 pozostaje glownie narzedziem technicznym, a w 0.2 moze trafic do UI uzytkownika.

## 10. Rekomendowany minimalny komplet dokumentow przed startem implementacji

- [x] `documents/README.md`
  Lokalizacja: [`documents/README.md`](../README.md)
- [x] `orchardlog_database_model.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/orchardlog_database_model.md`](../03_domain_and_business_rules/orchardlog_database_model.md)
- [x] `authorization_and_rls_strategy.md`
  Lokalizacja: [`documents/05_technical/authorization_and_rls_strategy.md`](../05_technical/authorization_and_rls_strategy.md)
- [x] `business_rules.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/business_rules.md`](../03_domain_and_business_rules/business_rules.md)
- [x] `mvp_scope_and_priorities.md`
  Lokalizacja: [`documents/02_product_documents/mvp_scope_and_priorities.md`](../02_product_documents/mvp_scope_and_priorities.md)
- [x] `screens_and_views.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/screens_and_views.md`](../04_ux_and_screen_design/screens_and_views.md)
- [x] `forms_and_fields.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/forms_and_fields.md`](../04_ux_and_screen_design/forms_and_fields.md)
- [x] `data_contracts.md`
  Lokalizacja: [`documents/06_backend_and_contracts/data_contracts.md`](../06_backend_and_contracts/data_contracts.md)
- [x] `api_and_system_operations.md`
  Lokalizacja: [`documents/06_backend_and_contracts/api_and_system_operations.md`](../06_backend_and_contracts/api_and_system_operations.md)
- [x] `mvp_acceptance_criteria.md`
  Lokalizacja: [`documents/07_security_and_quality/mvp_acceptance_criteria.md`](../07_security_and_quality/mvp_acceptance_criteria.md)
- [x] `test_plan.md`
  Lokalizacja: [`documents/07_security_and_quality/test_plan.md`](../07_security_and_quality/test_plan.md)

## 11. Kolejnosc uzupelniania dokumentacji, zeby najszybciej ruszyc z kodem

- [x] Krok 1: domknac `mvp_scope_and_priorities.md`
  Lokalizacja: [`documents/02_product_documents/mvp_scope_and_priorities.md`](../02_product_documents/mvp_scope_and_priorities.md)
- [x] Krok 2: spisac `business_rules.md`
  Lokalizacja: [`documents/03_domain_and_business_rules/business_rules.md`](../03_domain_and_business_rules/business_rules.md)
- [x] Krok 3: spisac `screens_and_views.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/screens_and_views.md`](../04_ux_and_screen_design/screens_and_views.md)
- [x] Krok 4: spisac `forms_and_fields.md`
  Lokalizacja: [`documents/04_ux_and_screen_design/forms_and_fields.md`](../04_ux_and_screen_design/forms_and_fields.md)
- [x] Krok 5: spisac `authorization_and_rls_strategy.md`
  Lokalizacja: [`documents/05_technical/authorization_and_rls_strategy.md`](../05_technical/authorization_and_rls_strategy.md)
- [x] Krok 6: spisac `api_and_system_operations.md`
  Lokalizacja: [`documents/06_backend_and_contracts/api_and_system_operations.md`](../06_backend_and_contracts/api_and_system_operations.md)
- [x] Krok 7: spisac `mvp_acceptance_criteria.md`
  Lokalizacja: [`documents/07_security_and_quality/mvp_acceptance_criteria.md`](../07_security_and_quality/mvp_acceptance_criteria.md)
- [x] Krok 8: spisac `test_plan.md`
  Lokalizacja: [`documents/07_security_and_quality/test_plan.md`](../07_security_and_quality/test_plan.md)
