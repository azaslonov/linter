import type { ISpectralDiagnostic } from "@stoplight/spectral-core";
import { Severity, ValidationResult } from "../models/ValidationResult";

const SpectralLinterName = "spectral";

export function convertToUniformResults(spectralOutput: ISpectralDiagnostic[]): ValidationResult[] {
    const uniformResults: ValidationResult[] = [];

    spectralOutput.forEach((spectralDiagnostic) => {
        const uniformResult: ValidationResult = {
            analyzer: SpectralLinterName,
            description: spectralDiagnostic.message,
            analyzerRuleName: String(spectralDiagnostic.code),
            severity: convertSeverityNumberToString(spectralDiagnostic.severity),
            docUrl: null,
            details: {
                range: {
                    start: `${spectralDiagnostic.range.start.line}:${spectralDiagnostic.range.start.character}`,
                    end: `${spectralDiagnostic.range.end.line}:${spectralDiagnostic.range.end.character}`
                }
            }
        };

        uniformResults.push(uniformResult);
    });

    return uniformResults;
}

/**
 * See https://docs.stoplight.io/docs/spectral/9ffa04e052cc1-spectral-cli#json-formatter for the format of the output
 */
function convertSeverityNumberToString(severity: number): Severity {
    switch (severity) {
        case 0:
            return "error";
        case 1:
            return "warning";
        case 2:
            return "information";
        case 3:
            return "hint";
        default:
            return "error";
    }
}