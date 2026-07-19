export class ApiResponse<T = unknown> {
	public readonly success: boolean;
	public readonly message: string;
	public readonly data: T | null;

	constructor(
		success: boolean,
		message: string,
		data: T | null = null,
	) {
		this.success = success;
		this.message = message;
		this.data = data;

		Object.freeze(this);
	}

}
