- dodać wizualizacje działek tak by urzytkownik widział

## Future idea — customer / marketplace module

W przyszłości warto rozważyć rozszerzenie OrchardLog / Sadownik+ o moduł **customer / marketplace**, który pozwoli połączyć sadowników z klientami zainteresowanymi zakupem owoców.

### Główna koncepcja

Klient mógłby:

- przeglądać listę sadowników z okolicy,
- widzieć, jakie owoce i w jakiej ilości sadownik deklaruje do sprzedaży,
- wysyłać zapytanie zakupowe do sadownika.

Sadownik mógłby:

- wystawiać dostępne produkty/oferty sprzedaży,
- określać ilość, jednostkę i podstawowe informacje o ofercie,
- otrzymywać powiadomienia o zapytaniach od klientów,
- kontaktować się z klientem przez aplikację lub poza nią (np. telefonicznie).

### Przykładowe use case’y

- klient widzi, że sadownik deklaruje `10 kg śliwki`,
- klient widzi, że sadownik deklaruje `1 tona jabłka odmiany Golden`,
- klient wysyła wiadomość z prośbą o zakup określonej ilości,
- sadownik otrzymuje powiadomienie i decyduje o dalszym kontakcie.

### Rekomendacja produktowa

Ten moduł ma sens, ale powinien być traktowany jako **osobny etap rozwoju produktu**, a nie część pierwszego core MVP systemu zarządzania sadem.

### Rekomendowany zakres przyszłego MVP tego modułu

- konto typu `customer`,
- publiczny profil sadownika / gospodarstwa,
- proste `sale_offers` / `product_listings`,
- `purchase_inquiries` / zapytania zakupowe,
- powiadomienia dla sadownika,
- kontakt przez formularz, telefon lub email.

### Świadoma decyzja architektoniczna

Na start ilości dostępne do sprzedaży powinny być raczej **deklarowane ręcznie przez sadownika**, a nie automatycznie liczone z całego modułu zbiorów i stanów magazynowych.

### Ważna uwaga

Jeśli moduł będzie wdrażany później, należy wyraźnie oddzielić:

- część operacyjną systemu (`orchard management`),
- od części handlowo-klienckiej (`marketplace / sales inquiries`).
