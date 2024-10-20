<script lang="ts" setup>
import { ref } from "vue";
import Papa, { type ParseResult } from "papaparse";

type NordeaSe = {
  Bokföringsdag: string;
};

const fileName = ref<string | null>(null);
const nordeaParsed = ref<ParseResult<NordeaSe>>();

// Function to handle file upload
const handleFileUpload = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (file.type === "text/csv") {
      fileName.value = file.name;

      convert(file);
    } else {
      alert("Please upload a valid CSV file.");
    }
  }
};

// Use PapaParse to parse, change and create a new file
function convert(file: File) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result: ParseResult<NordeaSe>) => {
      nordeaParsed.value = result;

      // Convert
      nordeaParsed.value.data = nordeaParsed.value.data.filter(
        // Filter out Reserverat
        (r) => r.Bokföringsdag !== "Reserverat"
      );
    },
    error: (error) => {
      console.error("Error parsing CSV:", error);
      alert("Failed to parse CSV file.");
    },
  });
}
</script>

<template>
  <div class="py-10 space-y-5">
    <input type="file" accept=".csv" @change="handleFileUpload" />
    <p v-if="fileName">Uploaded File: {{ fileName }}</p>

    <div v-if="nordeaParsed">
      <h3>CSV Content:</h3>
      <table>
        <tr>
          <th
            v-for="(field, index) in nordeaParsed.meta.fields"
            :key="'field-' + index"
          >
            {{ field }}
          </th>
        </tr>
        <tr
          v-for="(row, rowIndex) in nordeaParsed.data"
          :key="'row-' + rowIndex"
        >
          <td v-for="(cell, cellIndex) in row" :key="'cell-' + cellIndex">
            {{ cell }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>
