export const runtime = "nodejs";

import { app } from "@/server/app";

export const GET = async (request: Request) => app.fetch(request);
export const POST = async (request: Request) => app.fetch(request);
export const PATCH = async (request: Request) => app.fetch(request);
export const PUT = async (request: Request) => app.fetch(request);
export const DELETE = async (request: Request) => app.fetch(request);
export const OPTIONS = async (request: Request) => app.fetch(request);
