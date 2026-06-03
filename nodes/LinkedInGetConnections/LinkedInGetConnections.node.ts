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
const PER_PAGE_MAX = 1000;

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

interface ActionListResponse {
	items?: IDataObject[];
	cursor?: string | null;
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

export class LinkedInGetConnections implements INodeType {
	description: INodeTypeDescription = {
		name: 'linkedInGetConnections',
		displayName: 'Periodix LinkedIn Get Connections',
		description: 'List the 1st-degree connections of a connected LinkedIn account, for mutuals and re-engagement',
		icon: 'file:icon.svg',
		group: ['transform'],
		version: [1],
		subtitle: '={{ "Get connections" }}',
		defaults: { name: 'LinkedIn Get Connections' },
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
				description: 'Connected profile whose connections to list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'Connect a profile in the <a href="https://actions.periodix.net/profiles" target="_blank" rel="noopener noreferrer">Periodix Actions dashboard → Profiles</a>',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { returnAll: [false] } },
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
				const returnAll = this.getNodeParameter('returnAll', i) as boolean;
				const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);

				const collected: IDataObject[] = [];
				let cursor: string | undefined;

				do {
					const pageLimit = returnAll
						? PER_PAGE_MAX
						: Math.min(limit - collected.length, PER_PAGE_MAX);
					const body: IDataObject = { profileId, limit: pageLimit };
					if (cursor) body.cursor = cursor;

					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'periodixActionsApi',
						{
							method: 'POST',
							baseURL: BASE_URL,
							url: '/actions/get-relations/v1',
							body,
							json: true,
						},
					)) as ActionListResponse;

					const pageItems = response.items ?? [];
					for (const it of pageItems) {
						collected.push(it);
						if (!returnAll && collected.length >= limit) break;
					}
					cursor = response.cursor ?? undefined;
					if (pageItems.length === 0) break;
				} while (cursor && (returnAll || collected.length < limit));

				for (const it of collected) {
					returnData.push({ json: it, pairedItem: { item: i } });
				}
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
