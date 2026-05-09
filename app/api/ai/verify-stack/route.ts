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
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github+json",
    };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const userResponse = await fetch(`https://api.github.com/users/${githubUsername}`, { headers });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error("GitHub API Error:", userResponse.status, errorText);
      return NextResponse.json({ error: `GitHub API error: ${userResponse.statusText}` }, { status: userResponse.status });
    }

    const userData = await userResponse.json();
    const bio = userData.bio || "";

    if (!bio.includes(challengeCode)) {
      return NextResponse.json({ 
        error: "Verification failed", 
        message: `Please add the code '${challengeCode}' to your GitHub bio and try again.` 
      }, { status: 403 });
    }

    // 2. Fetch ALL Repositories (paginate if needed)
    let allRepos: any[] = [];
    let page = 1;
    while (true) {
      const reposResponse = await fetch(
        `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated&page=${page}`,
        { headers }
      );
      if (!reposResponse.ok) {
        const errorText = await reposResponse.text();
        console.error("GitHub API Error (Repos):", reposResponse.status, errorText);
        return NextResponse.json({ error: `Failed to fetch repositories: ${reposResponse.statusText}` }, { status: reposResponse.status });
      }
      const batch = await reposResponse.json();
      if (!batch.length) break;
      allRepos = allRepos.concat(batch);
      if (batch.length < 100) break; // last page
      page++;
      if (page > 5) break; // safety cap at 500 repos
    }

    // 3. Pre-aggregate language frequencies and all topics
    const langCounts: Record<string, number> = {};
    const allTopics = new Set<string>();

    for (const r of allRepos) {
      if (r.language) {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
      if (r.topics && Array.isArray(r.topics)) {
        r.topics.forEach((t: string) => allTopics.add(t));
      }
    }

    // Sort languages by frequency (most used first)
    const sortedLangs = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => `${lang} (${count} repos)`)
      .join(", ");

    // Dense repo list for AI context (top 40 by recent activity)
    const repoSummary = allRepos.slice(0, 40).map((r: any) => ({
      n: r.name,
      l: r.language,
      t: r.topics,
      s: r.stargazers_count
    }));

    // 4. AI Analysis via Groq — with quantitative evidence
    const prompt = `You are a senior technical recruiter analyzing a developer's GitHub profile to determine their verified tech stack.

DATA:
- Developer: ${githubUsername}
- Total public repos: ${allRepos.length}
- Language frequency across ALL repos: ${sortedLangs}
- All repo topics: ${[...allTopics].join(", ") || "none"}
- Recent repos (name, language, topics, stars): ${JSON.stringify(repoSummary)}

INSTRUCTIONS:
1. Identify the developer's PRIMARY technologies — both languages AND frameworks/tools.
2. A repo using "TypeScript" as primary language with topics ["react", "nextjs"] means they use React and Next.js — list those separately.
3. Look at repo names and topics for clues about frameworks (e.g. repo named "my-flask-app" = Python + Flask).
4. Include blockchain ecosystems if present (Solana, Ethereum, Sui, etc.).
5. Return 5-10 technologies, ordered from most proficient to least.
6. Return ONLY a comma-separated list. No explanations. No numbering.

Example output: TypeScript, React, Next.js, Rust, Solana, Python, Node.js, Tailwind CSS`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
    });

    let stackRaw = completion.choices[0]?.message?.content?.trim() || "Fullstack Developer";
    // Clean: remove any numbering, bullet points, or extra formatting the AI might add
    stackRaw = stackRaw.replace(/^\d+[\.\)]\s*/gm, "").replace(/^[-•]\s*/gm, "");
    const stackArray = stackRaw.split(/[,|\n]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30);
    const stack = stackArray.join(" | ");

    return NextResponse.json({ 
      verified: true, 
      stack: stack, // keeping for legacy fallback if needed
      stackArray: stackArray,
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
