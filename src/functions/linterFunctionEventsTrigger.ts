import { app, EventGridEvent, InvocationContext } from "@azure/functions";
import { runLinter } from "../runLinter";
import { RulesetFileName, RulesetFolderName } from "../Constants";
import * as path from "path";
import { parseResourceId } from "../utils/armResourceIdUtils";

export async function linterFunctionEventsTrigger(event: EventGridEvent, context: InvocationContext): Promise<void> {
    context.log('Event grid function processed event:', event);

    if (
        !event ||
        !event.data || 
        !event.data.resources || 
        !Array.isArray(event.data.resources) || 
        event.data.resources.length !== 1
    ) 
    {
        throw new Error('Event data is not valid');
    }
    
    const resource = event.data.resources[0];
    const inputContract = {
        title: resource.armResource.properties.title,
        description: resource.armResource.properties.description,
        specification: {
            name: resource.armResource.properties.specification.name,
            version: resource.armResource.properties.specification.version
        }
    };
    const apiDefinitionResource = parseResourceId(resource.armResource.id);
        
    // Note: __dirname is the dir name for the compiled javascript folder "linter-function-test/dist/src/functions/"
    const ruleFilePath = path.join(__dirname, "..", "..", "..", "resources", RulesetFolderName, RulesetFileName);

    context.log(`Calling linter function`);
    await runLinter(
        {
            inputContract: inputContract,
            apiDefinitionResource: apiDefinitionResource,
            rulesetFilePath: ruleFilePath,
        },
        context
    );
}

app.eventGrid('linter-function-events-trigger', {
    handler: linterFunctionEventsTrigger
});
