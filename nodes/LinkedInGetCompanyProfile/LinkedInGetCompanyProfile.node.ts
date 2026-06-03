import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const BASE_URL = 'https://actions.periodix.net/api/v1';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | null;

interface ProfileListItem {
	id: string;
	name: string;
	provider: string;
	connectionStatus: ConnectionStatus;
}

interface ProfilesHalList {
	count: number;
	_embedded?: { profiles?: ProfileListItem[] };
}

function statusLabel(status: ConnectionStatus): string {
	switch (status) {
		case 'connected':
			return 'Connected';
		case 'connecting':
			return 'Connecting';
		case 'disconnected':
			return 'Disconnected — reconnect in the dashboard';
		default:
			return 'Unknown status';
	}
}

export class LinkedInGetCompanyProfile implements INodeType {
	description: INodeTypeDescription = {
		name: 'linkedInGetCompanyProfile',
		displayName: 'Periodix LinkedIn Get Company Profile',
		description: 'Fetch a LinkedIn company profile — industry, size, description, and locations — for account research and enrichment',
		icon: 'file:icon.svg',
		group: ['transform'],
		version: [1],
		subtitle: '={{ "Get company: " + $parameter["identifier"] }}',
		defaults: { name: 'LinkedIn Get Company Profile' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// profileId uses a loadOptions dropdown (no value an AI agent could supply),
		// so the node is not exposed as an AI Agent tool.
		usableAsTool: undefined,
		credentials: [{ name: 'periodixActionsApi', required: true }],
		properties: [
			{
				displayName: 'Profile Name or ID',
				name: 'profileId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProfiles' },
				default: '',
				required: true,
				description: 'Connected profile to run the request from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'Connect a profile in the <a href="https://actions.periodix.net/profiles" target="_blank" rel="noopener noreferrer">Periodix Actions dashboard → Profiles</a>',
			},
			{
				displayName: 'Company',
				name: 'identifier',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. anthropic or 12345',
				description: 'Public identifier (the part after /company/ in the URL), numeric ID, or URN of the company',
			},
		],
	};

	methods = {
		loadOptions: {
			async getProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'periodixActionsApi',
					{
						method: 'GET',
						baseURL: BASE_URL,
						url: '/profiles',
						json: true,
					},
				)) as ProfilesHalList;

				const profiles = (response._embedded?.profiles ?? []).filter(
					(p) => p.provider === 'linkedin',
				);

				if (profiles.length === 0) {
					return [
						{
							name: 'No LinkedIn Profiles Found',
							value: '',
							description: 'Connect a LinkedIn profile in the Periodix Actions dashboard → Profiles, then reopen this dropdown',
						},
					];
				}

				return profiles.map((p) => ({
					name: p.name,
					value: p.id,
					description: statusLabel(p.connectionStatus),
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const profileId = this.getNodeParameter('profileId', i) as string;
				if (!profileId) {
					throw new NodeOperationError(this.getNode(), 'No LinkedIn profile selected', {
						itemIndex: i,
						description:
							'Connect a LinkedIn profile in the Periodix Actions dashboard (Profiles), then pick it in the Profile dropdown.',
					});
				}
				const identifier = this.getNodeParameter('identifier', i) as string;

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'periodixActionsApi',
					{
						method: 'POST',
						baseURL: BASE_URL,
						url: '/actions/get-company-profile/v1',
						body: { profileId, identifier },
						json: true,
					},
				)) as IDataObject;

				returnData.push({ json: response, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
