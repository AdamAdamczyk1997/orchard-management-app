### Notatki na dzień 18/04/2026

Najlepszy krok teraz to wejść w `Phase 3 - Activities + activity_scopes + activity_materials`.

To jest najbardziej logiczne z naszych planów, bo:

- `Phase 1-2` i pre-`Phase 3` stabilization są już domknięte,
- schema, RLS i dokumentacja dla aktywności są przygotowane,
- ten slice daje największy realny przyrost wartości,
- po nim dużo łatwiej wejść w `Phase 4` z `harvest_records` i summary.

Najrozsądniej zrobić to jako wąski vertical slice, nie wszystko naraz:

1. kontrakty + walidacja `ActivityFormInput`, `ActivityScopeInput`, `ActivityMaterialInput`
2. server actions: `listActivities`, `createActivity`, `updateActivity`
3. transakcyjny zapis `activities + scopes + materials`
4. minimalny UI: lista + create/edit form
5. testy unit/integration dla subtype, scope rules i performer membership

Nie zaczynałbym teraz od `harvest`, detail pages ani kolejnego polishu UI. Najwięcej sensu ma najpierw dowieźć działający dziennik prac sezonowych.

Jeśli chcesz, mogę od razu wejść w ten slice i zacząć od warstwy backend/contracts dla `activities`.
