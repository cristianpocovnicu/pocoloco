# Backlog din feedback real

Ce ne-au spus oamenii care folosesc Pocoloco, triat în trei coșuri.
Fișierul nu e o listă de dorințe: fiecare rând are o decizie și un motiv.

- **FACEM** — decis, cu ce s-a livrat deja și ce a mai rămas.
- **POATE** — merită, dar nu acum; scris ca să nu se redescopere.
- **NU** — respins conștient, cu motivul. Se redeschide doar cu argument nou.

Ce e amânat din motive de arhitectură, nu de prioritate, stă în
[`context-produs.md` §5](../context-produs.md).

---

## FACEM

### 1. Tipografia poveștilor lungi

**Treapta 1 — livrată (11 august 2026).** Textul lung de pe pagina
călătoriei și pe cea a experienței respiră: paragrafele au spațiu între
ele (nu doar întreruperi de linie), înălțimea rândului urcă la 1,7, iar pe
desktop lățimea de citire se oprește la ~68 de caractere. Fără schimbări
de structură.

**Treapta 2 — în POATE:** subtitluri în interiorul poveștii.

### 2. Auto-link pe opririle din povestea călătoriei

**Livrată (11 august 2026).** Numele unei opriri, scris în povestea
călătoriei, devine link către pagina locului. Se leagă doar opririle
călătoriei — un loc pomenit în treacăt n-are pagină garantată.

Reguli, ca textul să nu devină un covor de linkuri: nume complet,
insensibil la diacritice și la majuscule, **prima apariție** a fiecărui
loc, minimum 4 caractere.

**Mențiunile `@` la scriere** rămân în [`context-produs.md` §5]
(../context-produs.md) — dar cu nota: **validare primită de la un user
real (11 august 2026), prioritate crescută la redeschidere.**

---

## POATE

### Subtituri în povestea lungă

Treapta 2 a itemului 1. Ar cere un editor cu structură (sau o convenție de
markdown) și decizii despre cum arată în feed și în rezumate. Se redeschide
când poveștile lungi devin regula, nu excepția.

---

## NU

### Poze inserate în interiorul textului

Ar însemna un editor rich (blocuri, poziții, redimensionare), plus reguli
de afișare în feed, în rezumat și în datele structurate — un salt de
complexitate pe care nu-l plătim acum.

**Pozele trăiesc în experiențe:** fiecare loc din călătorie are galeria
lui, iar prima poză devine coperta. Cine vrea o poveste ilustrată o scrie
pe locuri, nu într-un bloc de text.
