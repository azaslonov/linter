import { InputContract } from "./contracts/InputContract";
import * as spectral from "@stoplight/spectral-core";
import * as parsers from "@stoplight/spectral-parsers"; 
import { fetch } from "@stoplight/spectral-runtime";
import { fetchFile, isJson } from "./utils/fileUtils";
import { InvocationContext } from "@azure/functions";
import { convertToUniformResults } from "./utils/validationResultsUtils";
import { ValidationResult } from "./models/ValidationResult";
import { DefaultAzureCredential, TokenCredential } from "@azure/identity";
import { RequestPrepareOptions, ServiceClient } from "@azure/ms-rest-js";
import { ApiDefinitionResource } from "./utils/armResourceIdUtils";
import { DeafultApiVersion } from "./Constants";

// these are in javascript format because the spectral library currently does not fully support typescript
const { bundleAndLoadRuleset } = require("@stoplight/spectral-ruleset-bundler/with-loader");
const fs = require("fs");

const domain = "apicenter-test-rp-bl.apicenter-test-rp-bl.p.azurewebsites.net";
export interface LinterOptions {
    inputContract: InputContract;
    apiDefinitionResource: ApiDefinitionResource;
    rulesetFilePath: string;
}

/**
 * Reference: https://meta.stoplight.io/docs/spectral/eb68e7afd463e-spectral-in-java-script
 * 
 */
export async function runLinter(options: LinterOptions, context: InvocationContext): Promise<void> {    
    // TODO : add better error handling

    // parse spec file

    const specFileContent = await getApiSpecificationFileContent(options.apiDefinitionResource, context);
    var apiSpecDocument = null;
    context.log(`Parsing spec file`);
    if (isJson(specFileContent)) {   
        apiSpecDocument = new spectral.Document(specFileContent, parsers.Json);
    } else {
        apiSpecDocument = new spectral.Document(specFileContent, parsers.Yaml);
    }

    if (!apiSpecDocument) {
        throw new Error(`Failed to parse spec file`);
    }

    // set ruleset

    context.log(`Setting ruleset`);
    const spectralClient = new spectral.Spectral();
    spectralClient.setRuleset(await bundleAndLoadRuleset(options.rulesetFilePath, {fs, fetch}));

    // lint

    context.log(`Linting`);
    const lintingResults = await spectralClient.run(apiSpecDocument);

    // transform results

    context.log(`Transforming results`);
    const outputLintingResults = convertToUniformResults(lintingResults);

    // call RP to store results
    await uploadResults(outputLintingResults, options.apiDefinitionResource);
    context.log(`Linting complete`);
}

async function uploadResults(validationResults: ValidationResult[], apiDefinitionResource: ApiDefinitionResource): Promise<void> {
    const credential: TokenCredential = new DefaultAzureCredential();
    const client = new ServiceClient();

    const validationResultsString = JSON.stringify(validationResults);
    const options: RequestPrepareOptions = {
        method: "POST",
        url: `https://${domain}/subscriptions/${apiDefinitionResource.subscriptionId}/resourceGroups/${apiDefinitionResource.resourceGroup}/providers/Microsoft.ApiCenter/services/${apiDefinitionResource.serviceName}/workspaces/${apiDefinitionResource.workspaceName}/apis/${apiDefinitionResource.apiName}/versions/${apiDefinitionResource.apiVersion}/definitions/${apiDefinitionResource.apiDefinition}/analysisReport?api-version=${DeafultApiVersion}`,
        body: {
            format: "inline",
            value: validationResultsString
        }
    };

    const response = await client.sendRequest(options);

    if (response.status !== 200) {
        throw new Error(`Failed to upload results. Status code: ${response.status}`);
    }
}

async function getApiSpecificationFileContent(apiDefinitionResource: ApiDefinitionResource, context: InvocationContext): Promise<string> {
    const credential: TokenCredential = new DefaultAzureCredential();
    const client = new ServiceClient();
    const options: RequestPrepareOptions = {
      method: "POST",
      url: `https://${domain}/subscriptions/${apiDefinitionResource.subscriptionId}/resourceGroups/${apiDefinitionResource.resourceGroup}/providers/Microsoft.ApiCenter/services/${apiDefinitionResource.serviceName}/workspaces/${apiDefinitionResource.workspaceName}/apis/${apiDefinitionResource.apiName}/versions/${apiDefinitionResource.apiVersion}/definitions/${apiDefinitionResource.apiDefinition}/exportSpecification?api-version=${DeafultApiVersion}`,
    };

    context.log(`fetching spec file with url: ${options.url}`);
    const response = await client.sendRequest(options);

    if (response.status !== 200) {
        throw new Error(`Failed to upload results. Status code: ${response.status}`);
    }

    var value = response.parsedBody.value;
    const format = response.parsedBody.format;

    // if the format is a link, fetch the content
    if (format.endsWith("-link")) {
        value = await fetchFile(response.parsedBody.value);
    } 

    return value;
}