<script lang="ts" setup>
import { ref } from "vue";
import Papa, { type ParseResult } from "papaparse";
import { Temporal } from "@js-temporal/polyfill";

/**
 * Type describing the rows retrived from a standard Nordea SE CSV Export.
 */
type NordeaRow = {
  "Datum för kontohändelse": string; // In credit card statements
  Bokföringsdag: string;
  Belopp: number;
  Avsändare: string;
  Mottagare: string;
  Namn: string;
  Rubrik: string;
  Saldo: number;
  Valuta: string;
};

/**
 * Type describing the expected result from the conversion.
 */
type YnabRow = { Date: string; Payee: string; Memo: string; Amount: number };

/**
 * Regular expression used to match different transaction types in the "Rubrik" field from
 * the Nordea SE format. Used to extract the matches from Rubrik and put in the Memo field.
 * Also used for populating Payee without the extracted part.
 */
const memoExtract = new RegExp(
  /^Kortköp 2\d{5} |^Autogiro |^Swish betalning |^Swish inbetalning |^Insättning kort 2\d{5} /
);

/**
 * Refs used in the component.
 */
const fileName = ref<string | null>(null);
const parsedNordeaData = ref<ParseResult<NordeaRow>>();
const convertedYnabData = ref<YnabRow[]>();
const error = ref<string>();

/**
 * Function triggered when a file is uploaded.
 * Resets previous state, validates the file, and starts the conversion if valid.
 *
 * @param event - The input event from the file selection.
 */
const handleFileUpload = (event: Event): void => {
  reset();

  const input = event.target as HTMLInputElement;

  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.type === "text/csv") {
      window.fathom.trackEvent("CSV File Upload");
      fileName.value = file.name;
      convert(file);
    } else {
      error.value = "Please upload a valid CSV file.";
    }
  }
};

/**
 * Function to reset the state of the file upload and parsed data.
 * Clears fileName, parsed CSV data, and any errors.
 */
function reset() {
  fileName.value = null;
  parsedNordeaData.value = undefined;
  error.value = undefined;
  convertedYnabData.value = undefined;
}

/**
 * Formats the date from a Nordea CSV row to the standard YYYY-MM-DD format.
 * If the date format is valid (contains a 4-digit year), it replaces slashes ("/") with hyphens ("-")
 * and converts it into a `Temporal.PlainDate` object for consistent formatting.
 * If the date format is invalid or does not contain a 4-digit year, the original value is returned.
 *
 * @param value - The raw date string from the Nordea CSV (e.g., "2023/09/14").
 * @returns Formatted date string in YYYY-MM-DD format, or the original value if formatting is invalid.
 */
function formatNordeaDate(value: string): string {
  if (!value.match(/[0-9]{4}/)) return value;

  return Temporal.PlainDate.from(value.replaceAll("/", "-")).toString();
}

/**
 * Cleans up and standardizes number formats for fields like "Belopp" and "Saldo".
 * Removes spaces and converts decimal commas to decimal points.
 *
 * @param value - The raw number string from Nordea CSV.
 * @returns A properly formatted number.
 */
function cleanNumber(value: string): number {
  return parseFloat(
    value
      .replaceAll(" ", "")
      .replace(/,(\d{2})$/, ".$1")
      .trim()
  );
}

/**
 * Main function to convert the CSV file.
 * Uses PapaParse to transform Nordea data into YNAB format.
 *
 * @param file - The uploaded CSV file from Nordea.
 */
function convert(file: File) {
  Papa.parse<NordeaRow>(file, {
    header: true,
    skipEmptyLines: "greedy",
    transform: (value, field: keyof NordeaRow) => {
      if (field === "Bokföringsdag") {
        return formatNordeaDate(value);
      } else if (field === "Belopp" || field === "Saldo") {
        return cleanNumber(value);
      }

      return value;
    },
    complete: (result: ParseResult<NordeaRow>) => {
      // Check fields
      if (
        !result.meta.fields?.includes("Bokföringsdag") ||
        !result.meta.fields?.includes("Rubrik") ||
        !result.meta.fields?.includes("Belopp")
      ) {
        error.value =
          "Original file is missing one or many of the required fields Bokföringsdag, Rubrik and Belopp.";
        return;
      }

      parsedNordeaData.value = result;

      // Filter out rows without date (typically "Reserverat")
      // For Credit Cards, also filter out transactions not yet settled (title is only "KÖP")
      parsedNordeaData.value.data = parsedNordeaData.value.data.filter(
        (r) =>
          (r.Bokföringsdag || r["Datum för kontohändelse"]).match(/\d{4}/) &&
          r.Rubrik !== "KÖP"
      );

      // Transform Nordea format to YNAB format
      convertedYnabData.value = parsedNordeaData.value.data.map((r) => ({
        Date: r.Bokföringsdag || r["Datum för kontohändelse"],
        Payee: r.Rubrik.replace(memoExtract, "").trim(),
        Memo: r.Rubrik.match(memoExtract)?.[0] || "",
        Amount: r.Belopp,
      }));

      // Error if empty
      if (!convertedYnabData.value.length) {
        error.value = "Converted file has no entries.";
        return;
      }
    },
    error: (err) => {
      console.error("Error parsing CSV:", err);
      error.value = "Failed to parse CSV file." + err;
    },
  });
}

/**
 * Triggered by button click, downloads the converted YNAB data as a CSV
 * and downloads to client.
 */
function download() {
  if (!convertedYnabData.value) {
    alert("Unable to download.");
    return;
  }

  // Convert the data to CSV format
  const csv = Papa.unparse(convertedYnabData.value);

  // Create a Blob object from the CSV data
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  // Create a temporary link element
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);

  // Set the download attribute to specify the file name
  link.setAttribute("download", fileName.value + ".ynab.csv");

  // Append the link to the document body
  document.body.appendChild(link);

  // Trigger the download by simulating a click
  link.click();

  // Clean up by revoking the object URL and removing the link
  URL.revokeObjectURL(url);
  document.body.removeChild(link);

  window.fathom.trackEvent("CSV File Download");
}
</script>

<template>
  <div class="space-y-10">
    <div class="space-y-2">
      <h2>1. Provide Nordea CSV</h2>
      <p>
        Export your transaction history from
        <a href="https://www.nordea.se/" class="lnk">Nordea SE</a> to your
        device and upload it here.
      </p>
      <div class="flex items-center space-x-2 overflow-auto">
        <i class="ph-fill ph-upload text-xl text-nordea" />
        <input type="file" accept=".csv" @change="handleFileUpload" />
      </div>
    </div>

    <div v-if="error" class="space-y-2 text-red-700">
      <h2>2. Error</h2>
      <p class="bg-red-700 text-white p-2 font-medium rounded-sm">
        {{ error }}
      </p>
      <p>Try again…</p>
    </div>

    <div v-if="parsedNordeaData" class="space-y-2 overflow-auto">
      <h2>2. Review original</h2>
      <table>
        <thead>
          <tr>
            <th v-for="field in parsedNordeaData.meta.fields">
              {{ field }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in parsedNordeaData.data.slice(0, 5)">
            <td
              v-for="cell in row"
              :class="typeof cell === 'number' ? 'text-right' : 'text-left'"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th :colspan="parsedNordeaData.meta.fields?.length">
              Showing {{ parsedNordeaData.data.slice(0, 5).length }} of
              {{ parsedNordeaData.data.length }} rows.
            </th>
          </tr>
        </tfoot>
      </table>
    </div>

    <div
      v-if="convertedYnabData && convertedYnabData.length && !error"
      class="space-y-2 overflow-auto"
    >
      <h2>3. Review converted</h2>
      <table>
        <thead>
          <tr>
            <th v-for="field in Object.keys(convertedYnabData[0])">
              {{ field }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in convertedYnabData.slice(0, 5)">
            <td
              v-for="cell in row"
              :class="typeof cell === 'number' ? 'text-right' : 'text-left'"
            >
              {{ cell }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th :colspan="Object.keys(convertedYnabData[0]).length">
              Showing {{ convertedYnabData.slice(0, 5).length }} of
              {{ convertedYnabData.length }} rows.
            </th>
          </tr>
        </tfoot>
      </table>
    </div>

    <div
      v-if="convertedYnabData && convertedYnabData.length && !error"
      class="space-y-2 overflow-auto"
    >
      <h2>4. Download!</h2>
      <div class="flex items-center space-x-5">
        <button class="btn btn--nordea btn--big" @click="download">
          <i class="ph-fill ph-download" />
          Download file
        </button>

        <button class="lnk" @click="reset">Reset</button>
      </div>
    </div>
  </div>
</template>
