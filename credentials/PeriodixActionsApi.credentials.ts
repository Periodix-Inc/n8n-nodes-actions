import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PeriodixActionsApi implements ICredentialType {
	name = 'periodixActionsApi';
	displayName = 'Periodix Actions API';
	documentationUrl = 'https://actions.periodix.net';
	icon: ICredentialType['icon'] = 'file:icon.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key for the Periodix Actions API',
			hint: 'Generate one in the <a href="https://actions.periodix.net/api-keys" target="_blank" rel="noopener noreferrer">Periodix Actions dashboard → API Keys</a>',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://actions.periodix.net/api/v1',
			url: '/organizations/me',
			method: 'GET',
		},
	};
}
