import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FakeToxicityProvider } from '../src/providers/toxicity/fake.js';
import { PerspectiveToxicityProvider } from '../src/providers/toxicity/perspective.js';
import { THRESHOLDS } from '../src/policy/moderationPolicy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runEvaluation() {
  const datasetPath = path.join(__dirname, '../datasets/toxicity_sample.json');
  const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

  // Use fake provider by default unless API key is provided
  const provider = process.env.PERSPECTIVE_API_KEY
    ? new PerspectiveToxicityProvider(process.env.PERSPECTIVE_API_KEY)
    : new FakeToxicityProvider();

  console.log(`Starting evaluation with provider: ${provider.constructor.name}`);
  
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  for (const item of dataset) {
    const result = await provider.classify(item.text);
    // Use the lowest threshold (REVIEW) for binary classification evaluation
    const predictedToxic = result.score >= THRESHOLDS.REVIEW ? 1 : 0;
    const actualToxic = item.label;

    if (predictedToxic === 1 && actualToxic === 1) truePositives++;
    if (predictedToxic === 1 && actualToxic === 0) falsePositives++;
    if (predictedToxic === 0 && actualToxic === 0) trueNegatives++;
    if (predictedToxic === 0 && actualToxic === 1) falseNegatives++;
    
    // Add brief artificial delay to respect rate limits if using real API
    if (process.env.PERSPECTIVE_API_KEY) await new Promise(r => setTimeout(r, 200));
  }

  const precision = truePositives / (truePositives + falsePositives || 1);
  const recall = truePositives / (truePositives + falseNegatives || 1);
  const f1 = 2 * (precision * recall) / (precision + recall || 1);

  const report = `
# ML Evaluation Report
**Date:** ${new Date().toISOString()}
**Provider:** ${provider.constructor.name}
**Dataset:** toxicity_sample.json (N=${dataset.length})

## Metrics
- **Threshold (REVIEW):** ${THRESHOLDS.REVIEW}
- **True Positives:** ${truePositives}
- **False Positives:** ${falsePositives}
- **True Negatives:** ${trueNegatives}
- **False Negatives:** ${falseNegatives}

- **Precision:** ${(precision * 100).toFixed(2)}%
- **Recall:** ${(recall * 100).toFixed(2)}%
- **F1 Score:** ${(f1 * 100).toFixed(2)}%
  `;

  const reportDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
  
  fs.writeFileSync(path.join(reportDir, 'latest_eval.md'), report.trim());
  console.log('Evaluation complete. Report written to ml/reports/latest_eval.md');
  console.log(report.trim());
}

runEvaluation().catch(console.error);
