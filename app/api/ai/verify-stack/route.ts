import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { githubUsername, walletAddress, challengeCode } = await req.json();

    if (!githubUsername || !walletAddress || !challengeCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify Bio
    const userResponse = await fetch(`https://api.github.com/users/${githubUsername}`, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`, // Optional but recommended
      }
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
    }

    const userData = await userResponse.json();
    const bio = userData.bio || "";

    if (!bio.includes(challengeCode)) {
      return NextResponse.json({ 
        error: "Verification failed", 
        message: `Please add the code '${challengeCode}' to your GitHub bio and try again.` 
      }, { status: 403 });
    }

    // 2. Fetch Repositories
    const reposResponse = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=50&sort=updated`, {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      }
    });

    if (!reposResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }

    const repos = await reposResponse.json();
    const repoInfo = repos.map((r: any) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      topics: r.topics
    }));

    // 3. AI Analysis via Groq
    const prompt = `Analyze this developer's GitHub repositories and summarize their primary tech stack in 3-5 keywords separated by pipes (|). 
    Focus on specific technologies (e.g., React, Rust, Solana, Python). 
    Developer: ${githubUsername}
    Repos: ${JSON.stringify(repoInfo.slice(0, 15))}
    Return ONLY the keywords, nothing else. Example: React | TypeScript | Node.js`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-70b-versatile",
      temperature: 0.1,
    });

    const stack = completion.choices[0]?.message?.content?.trim() || "Fullstack Developer";

    return NextResponse.json({ 
      verified: true, 
      stack: stack,
      githubData: {
        name: userData.name,
        avatar: userData.avatar_url,
        bio: userData.bio
      }
    });

  } catch (error: any) {
    console.error("Tech stack verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
