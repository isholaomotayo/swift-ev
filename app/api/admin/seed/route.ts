import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
        return NextResponse.json({ success: false, error: "NEXT_PUBLIC_CONVEX_URL not configured" }, { status: 500 });
    }
    const convex = new ConvexHttpClient(convexUrl);

    const secret = process.env.SEED_SECRET;
    if (!secret || req.headers.get("x-seed-secret") !== secret) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { clearExisting } = await req.json();

        // Image mapping
        const imageFiles = [
            { name: "byd-atto-3.png", path: "public/images/vehicles/byd-atto-3.png" },
            { name: "byd-seal.png", path: "public/images/vehicles/byd-seal.png" },
            { name: "xpeng-p7.png", path: "public/images/vehicles/xpeng-p7.png" },
            { name: "xpeng-g9.png", path: "public/images/vehicles/xpeng-g9.png" },
            { name: "byd-tang.png", path: "public/images/vehicles/byd-tang.png" },
            { name: "nio-es6.png", path: "public/images/vehicles/nio-es6.png" },
        ];

        const imageStorageIds: Record<string, string> = {};

        for (const file of imageFiles) {
            const key = `image_storage_id_${file.name}`;

            // Check if already uploaded
            let storageId = await convex.query(api.seedData.getImageStorageId, { key });

            if (!storageId) {
                console.log(`Uploading ${file.name}...`);

                // 1. Get Upload URL
                const uploadUrl = await convex.mutation(api.seedData.generateSeedUploadUrl, { secret });

                // 2. Read file
                const filePath = path.join(process.cwd(), file.path);
                const fileBuffer = fs.readFileSync(filePath);
                // Note: In Next.js App Router, Blob is available globally
                const blob = new Blob([fileBuffer], { type: "image/png" });

                // 3. Upload
                const result = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": "image/png" },
                    body: blob,
                });

                if (!result.ok) {
                    throw new Error(`Failed to upload ${file.name}: ${result.statusText}`);
                }

                const { storageId: newId } = await result.json();
                storageId = newId;

                // 4. Save ID
                await convex.mutation(api.seedData.saveImageStorageId, { secret, key, storageId: storageId! });
                console.log(`Uploaded ${file.name} -> ${storageId}`);
            } else {
                console.log(`Using existing ${file.name} -> ${storageId}`);
            }

            imageStorageIds[file.name] = storageId!;
        }

        // Call seed
        console.log("Seeding database...");
        const result = await convex.mutation(api.seedData.seedDatabase, {
            secret,
            clearExisting: !!clearExisting,
            imageStorageIds,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
