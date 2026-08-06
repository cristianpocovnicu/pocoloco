/**
 * Țările lumii, în română. Listă statică: nu justifică un tabel în DB
 * și nici un apel de rețea — se schimbă o dată la câțiva ani.
 *
 * Datele vechi (țări scrise liber înainte de autocomplete) rămân
 * afișate ca atare; lista de aici constrânge doar ce se adaugă de acum.
 */
export const COUNTRIES_RO = [
  'Afganistan', 'Africa de Sud', 'Albania', 'Algeria', 'Andorra', 'Angola',
  'Antigua și Barbuda', 'Arabia Saudită', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaidjan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados',
  'Belarus', 'Belgia', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia și Herțegovina', 'Botswana', 'Brazilia', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodgia', 'Camerun', 'Canada', 'Capul Verde',
  'Cehia', 'Chile', 'China', 'Cipru', 'Columbia', 'Comore', 'Congo',
  'Coreea de Nord', 'Coreea de Sud', 'Costa Rica', 'Coasta de Fildeș',
  'Croația', 'Cuba', 'Danemarca', 'Djibouti', 'Dominica', 'Ecuador', 'Egipt',
  'El Salvador', 'Elveția', 'Emiratele Arabe Unite', 'Eritreea', 'Estonia',
  'Eswatini', 'Etiopia', 'Fiji', 'Filipine', 'Finlanda', 'Franța', 'Gabon',
  'Gambia', 'Georgia', 'Germania', 'Ghana', 'Grecia', 'Grenada', 'Guatemala',
  'Guineea', 'Guineea-Bissau', 'Guineea Ecuatorială', 'Guyana', 'Haiti',
  'Honduras', 'India', 'Indonezia', 'Irak', 'Iran', 'Irlanda', 'Islanda',
  'Israel', 'Italia', 'Jamaica', 'Japonia', 'Iordania', 'Kazahstan', 'Kenya',
  'Kirghizstan', 'Kiribati', 'Kosovo', 'Kuwait', 'Laos', 'Lesotho', 'Letonia',
  'Liban', 'Liberia', 'Libia', 'Liechtenstein', 'Lituania', 'Luxemburg',
  'Macedonia de Nord', 'Madagascar', 'Malaezia', 'Malawi', 'Maldive', 'Mali',
  'Malta', 'Maroc', 'Insulele Marshall', 'Mauritania', 'Mauritius', 'Mexic',
  'Micronezia', 'Moldova', 'Monaco', 'Mongolia', 'Muntenegru', 'Mozambic',
  'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Nicaragua', 'Niger', 'Nigeria',
  'Norvegia', 'Noua Zeelandă', 'Olanda', 'Oman', 'Pakistan', 'Palau',
  'Palestina', 'Panama', 'Papua Noua Guinee', 'Paraguay', 'Peru', 'Polonia',
  'Portugalia', 'Qatar', 'Regatul Unit', 'Republica Centrafricană',
  'Republica Democrată Congo', 'Republica Dominicană', 'România', 'Rusia',
  'Rwanda', 'Saint Kitts și Nevis', 'Saint Lucia',
  'Saint Vincent și Grenadinele', 'Samoa', 'San Marino',
  'São Tomé și Príncipe', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone',
  'Singapore', 'Siria', 'Slovacia', 'Slovenia', 'Insulele Solomon', 'Somalia',
  'Spania', 'Sri Lanka', 'Statele Unite ale Americii', 'Sudan',
  'Sudanul de Sud', 'Suedia', 'Surinam', 'Tadjikistan', 'Tanzania', 'Thailanda',
  'Timorul de Est', 'Togo', 'Tonga', 'Trinidad și Tobago', 'Tunisia', 'Turcia',
  'Turkmenistan', 'Tuvalu', 'Ucraina', 'Uganda', 'Ungaria', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe',
]

/** Caută fără diacritice și fără majuscule, ca „romania" să găsească „România". */
export function searchCountries(query: string, exclude: string[] = []): string[] {
  const normalize = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ș/g, 's').replace(/ț/g, 't')

  const term = normalize(query.trim())
  const taken = new Set(exclude)

  return COUNTRIES_RO
    .filter(country => !taken.has(country))
    .filter(country => (term ? normalize(country).includes(term) : true))
    .slice(0, 8)
}
