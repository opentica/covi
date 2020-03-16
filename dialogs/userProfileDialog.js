// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { MessageFactory } = require('botbuilder');
const {
    AttachmentPrompt,
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { channels } = require('botbuilder-dialogs/lib/choices/channel');
const { UserProfile } = require('../userProfile');

const ATTACHMENT_PROMPT = 'ATTACHMENT_PROMPT';
const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const USER_PROFILE = 'USER_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class UserProfileDialog extends ComponentDialog {
    constructor(userState) {
        super('userProfileDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.agePromptValidator));
        this.addDialog(new AttachmentPrompt(ATTACHMENT_PROMPT, this.picturePromptValidator));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.symptomsStep.bind(this),
            this.travelStep.bind(this),
            this.internationlTravelStep.bind(this),
            this.closeContactlStep.bind(this),
            this.covid19ContactStep.bind(this),
            this.covid19LabExposureStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async symptomsStep(step) {
        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is a Prompt Dialog.
        // Running a prompt here means the next WaterfallStep will be run when the user's response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Do you have any of the below symptoms ? Fever > 38 C or subjective fever, Cough,Shortness of breath/breathing diffuclties, other symptoms such as muscle aches, headache, sore throat, runny nose, diarrhea. Note symptoms in young children may be non-specific – e.g. lethargy, poor feeding.',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    async travelStep(step) {
        step.values.symptoms = step.result.value;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Have you travelled in the last 14 days to Hubei Province (including Wuhan) in China, Iran, or Italy?',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    async internationlTravelStep(step) {
        step.values.travel = step.result.value;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Have you travelled internationally in the last 14 days?',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    async closeContactlStep(step) {
        step.values.internationlTrave = step.result.value;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Have you had close contact (face-to-face contact within 2 meters/6 feet) with someone who is ill with cough and/or fever who has traveled internationally within 14 days prior to their illness onset? (Contact may be in Canada or during travel)',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    async covid19ContactStep(step) {
        step.values.closeContact = step.result.value;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Have you been in contact in the last 14 days with someone that is confirmed to be a case of COVID-19?',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    async covid19LabExposureStep(step) {
        step.values.covid19Contact = step.result.value;
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Have you had laboratory exposure while working directly with specimens known to contain COVID-19?',
            choices: ChoiceFactory.toChoices(['Yes', 'No'])
        });
    }

    

    

    async summaryStep(step) {
        var msgCond="";
        step.values.covid19LabExposure = step.result.value;
        const conditionsArray = [
            step.values.symptoms=='No',
            step.values.travel=='No',
            step.values.internationlTrave=='No',
            step.values.closeContact=='No',
            step.values.covid19Contact=='No',
            step.values.covid19LabExposure=='No',
        ]
        if (conditionsArray.indexOf(false) === -1) {
            await step.context.sendActivity("no further assessment is required. Provide reassurance education. If they develop symptoms in the next 14 days, provide general advice");
        }
        else if (step.values.symptoms=='Yes')
        {
            if(step.values.travel=='Yes'||step.values.internationlTrave=='Yes'||step.values.covid19Contact=='Yes'||step.values.covid19LabExposure=='Yes') {
                msgCond="Triage for medical assessment–these individuals require assessment/testing. The individual should be assessed in their local urgent care center or emergency room. Public health/ Health Links should call ahead and advise the facility that a an individual with a history of international travel in the previous 14 days or a contact of COVID-19 will be attending the facility and have symptoms of COVID-19. Inform the individual that they will be provided with a mask to wear and will be isolated upon arrival."
                await step.context.sendActivity(msgCond)
            }
            else if(step.values.closeContact=='Yes')
            {
                msgCond= "Further assessment is required to determine their risk of exposure to COVID-19. If symptoms are mild (e.g. upper respiratory tract symptoms), recommend observing symptoms, to call back if symptoms worsen, and self-isolate at home until symptoms are completely resolved. If symptoms worsen, they should be assessed in their local urgent care center or emergency room, and ensure they call ahead and inform them of their travel history."
                await step.context.sendActivity(msgCond)
            } 
        }


        
        
    

        // WaterfallStep always finishes with the end of the Waterfall or with another dialog; here it is the end.
        return await step.endDialog();
    }

    
}

module.exports.UserProfileDialog = UserProfileDialog;
