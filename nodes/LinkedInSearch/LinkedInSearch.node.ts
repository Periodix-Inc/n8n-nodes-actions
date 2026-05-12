import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const BASE_URL = 'https://actions.periodix.net/api/v1';
const DEFAULT_TIMEOUT_MINUTES = 60;

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

interface CallbackBody {
	status?: string;
	output?: { items?: unknown[] } | null;
	error?: string | null;
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

export class LinkedInSearch implements INodeType {
	description: INodeTypeDescription = {
		name: 'linkedInSearch',
		displayName: 'Periodix LinkedIn Search',
		description: 'Search LinkedIn People, Companies, Posts, and Jobs (Classic or Sales Navigator) by URL',
		icon: 'file:icon.svg',
		group: ['transform'],
		version: [1],
		subtitle: '={{ $parameter["searchUrl"].includes("/sales/") ? "Sales Navigator search" : "LinkedIn search" }}',
		defaults: { name: 'LinkedIn Search' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// The node is not suitable as an AI Agent tool: profileId uses a
		// loadOptions dropdown (no value an agent can pass), and the
		// wait-for-webhook pattern breaks synchronous tool-call semantics.
		usableAsTool: undefined,
		credentials: [{ name: 'periodixActionsApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '',
				restartWebhook: true,
				isFullPath: false,
			},
		],
		properties: [
			{
				displayName: 'Profile Name or ID',
				name: 'profileId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getProfiles' },
				default: '',
				required: true,
				description: 'Profile to run the search from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'Connect a profile in the <a href="https://actions.periodix.net/profiles" target="_blank" rel="noopener noreferrer">Periodix Actions dashboard → Profiles</a>',
			},
			{
				displayName: 'Search URL',
				name: 'searchUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. https://www.linkedin.com/sales/search/people?...',
				description: 'LinkedIn search URL (Classic or Sales Navigator; People, Companies, Posts, or Jobs)',
				hint: 'Paste a search URL — Classic (<a href="https://www.linkedin.com/search/results/people/" target="_blank" rel="noopener noreferrer">People</a>, <a href="https://www.linkedin.com/search/results/companies/" target="_blank" rel="noopener noreferrer">Companies</a>, <a href="https://www.linkedin.com/search/results/content/" target="_blank" rel="noopener noreferrer">Posts</a>, <a href="https://www.linkedin.com/search/results/jobs/" target="_blank" rel="noopener noreferrer">Jobs</a>) or Sales Navigator (<a href="https://www.linkedin.com/sales/search/people" target="_blank" rel="noopener noreferrer">People</a>, <a href="https://www.linkedin.com/sales/search/company" target="_blank" rel="noopener noreferrer">Companies</a>). Result shape depends on the URL.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				placeholder: 'e.g. 100',
				description: 'Max number of results to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Timeout (Minutes)',
						name: 'timeoutMinutes',
						type: 'number',
						typeOptions: { minValue: 1 },
						default: DEFAULT_TIMEOUT_MINUTES,
						description: 'Maximum time to wait for the search to complete before giving up',
					},
				],
			},
		],
	};

	// The `webhooks` declaration on `description` uses `restartWebhook: true` —
	// it is the per-execution resume URL emitted by `$execution.resumeUrl`, not a
	// webhook registered with a third-party service. n8n manages its lifecycle
	// internally and does not call these methods, but the community-nodes lint
	// rule still requires the full `checkExists` / `create` / `delete` set.
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
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

		if (items.length !== 1) {
			throw new NodeOperationError(
				this.getNode(),
				items.length === 0
					? 'No input item to process'
					: 'This node processes one input item per execution. Wrap with "Split In Batches" (batch size 1) to run multiple searches.',
			);
		}

		const profileId = this.getNodeParameter('profileId', 0) as string;
		if (!profileId) {
			throw new NodeOperationError(
				this.getNode(),
				'No LinkedIn profile selected',
				{
					itemIndex: 0,
					description:
						'Connect a LinkedIn profile in the Periodix Actions dashboard (Profiles), then pick it in the Profile dropdown.',
				},
			);
		}
		const searchUrl = this.getNodeParameter('searchUrl', 0) as string;
		const limit = this.getNodeParameter('limit', 0) as number;
		const options = this.getNodeParameter('options', 0, {}) as { timeoutMinutes?: number };
		const timeoutMinutes = options.timeoutMinutes ?? DEFAULT_TIMEOUT_MINUTES;

		const callbackUrl = this.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string;

		try {
			await this.helpers.httpRequestWithAuthentication.call(this, 'periodixActionsApi', {
				method: 'POST',
				baseURL: BASE_URL,
				url: '/actions/linkedin-search/v1',
				body: { profileId, searchUrl, limit, callbackUrl },
				json: true,
			});
		} catch (error) {
			if (this.continueOnFail()) {
				return [[{ json: { error: (error as Error).message }, pairedItem: { item: 0 } }]];
			}
			throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: 0 });
		}

		const waitTill = new Date(Date.now() + timeoutMinutes * 60 * 1000);
		await this.putExecutionToWait(waitTill);
		return [items];
	}

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = (this.getBodyData() ?? {}) as CallbackBody;

		if (!body.status) {
			throw new NodeOperationError(
				this.getNode(),
				'Search timed out before Periodix Actions returned results',
				{
					description:
						'No callback was received within the configured timeout. Increase Timeout (Minutes), or check the profile connection status and search URL in the Periodix Actions dashboard, then retry.',
				},
			);
		}

		if (body.status === 'failed') {
			throw new NodeOperationError(
				this.getNode(),
				`Search did not complete: ${body.error ?? 'unknown reason'}`,
				{
					description:
						'Check the profile connection status in the Periodix Actions dashboard and that the search URL is reachable from the selected profile, then retry.',
				},
			);
		}

		const resultItems = body.output?.items ?? [];
		const data: INodeExecutionData[] = resultItems.map((person) => ({
			json: person as IDataObject,
			pairedItem: { item: 0 },
		}));

		return { workflowData: [data] };
	}
}
