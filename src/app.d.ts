/// <reference types="@sveltejs/kit" />

declare global {
	namespace App {
		interface Locals {
			user: import('$lib/types').AuthUser | null;
		}
		interface PageData {
			user: import('$lib/types').AuthUser | null;
		}
	}
}

export {};
