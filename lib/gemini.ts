import { Sermon, MoodType } from "./types"
import Constants from 'expo-constants';

// Try multiple sources for the API key
const GEMINI_API_KEY = 
  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
  Constants.expoConfig?.extra?.geminiApiKey ||
  'AIzaSyC6cPr0wx8amOOfAf2od7ByxWivw-ZLAuE'; // Fallback to hardcoded key

export async function generateSermon(topic: string): Promise<Sermon> {
  console.log('🔮 Starting sermon generation for topic:', topic);
  
  // Debug: Check which source provided the key
  const keySource = process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'process.env' : 
                   Constants.expoConfig?.extra?.geminiApiKey ? 'expo-constants' : 
                   'hardcoded fallback';
  console.log('🔑 Gemini API key source:', keySource);
  console.log('🔑 process.env.EXPO_PUBLIC_GEMINI_API_KEY:', process.env.EXPO_PUBLIC_GEMINI_API_KEY ? 'SET' : 'NOT SET');
  console.log('🔑 Constants.expoConfig?.extra?.geminiApiKey:', Constants.expoConfig?.extra?.geminiApiKey ? 'SET' : 'NOT SET');
  
  if (!GEMINI_API_KEY) {
    const error = "Missing EXPO_PUBLIC_GEMINI_API_KEY environment variable";
    console.error('❌', error);
    throw new Error(error);
  }

  console.log('✅ Gemini API key found (length:', GEMINI_API_KEY.length, ')');

  const systemInstruction =
    "You are a helpful assistant that returns only valid JSON. Do not include any extra text."

  const prompt = `Return ONLY valid minified JSON with keys: verses (array of 2 strings), interpretation (string), story (string). Do not include markdown, code fences, or commentary. Example: {"verses":["...","..."],"interpretation":"...","story":"..."}. Now create content about: "${topic}".`

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  console.log('📤 Calling Gemini API:', apiUrl.replace(GEMINI_API_KEY, '***KEY***'));

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }),
    });

    console.log('📥 Gemini API response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Gemini API error response:', errorText);
      let errorMessage = `Gemini API error: ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    const result = await res.json();
    console.log('📦 Gemini API response structure:', {
      hasCandidates: !!result?.candidates,
      candidatesLength: result?.candidates?.length || 0,
    });

    const text: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('❌ Unexpected Gemini response format:', JSON.stringify(result, null, 2));
      throw new Error("Unexpected Gemini response format - no text content found");
    }

    console.log('📝 Raw Gemini response text (first 200 chars):', text.substring(0, 200));

    const trimmed = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
      console.log('✅ Successfully parsed JSON from Gemini response');
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Text that failed to parse:', trimmed.substring(0, 500));
      throw new Error(`Gemini returned non-JSON content: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    // Basic shape validation
    const maybe = json as Partial<Sermon>;
    if (!maybe || !Array.isArray(maybe.verses) || maybe.verses.length < 1 || !maybe.interpretation || !maybe.story) {
      console.error('❌ JSON validation failed:', {
        hasVerses: Array.isArray(maybe?.verses),
        versesLength: maybe?.verses?.length || 0,
        hasInterpretation: !!maybe?.interpretation,
        hasStory: !!maybe?.story,
        fullJson: JSON.stringify(maybe, null, 2),
      });
      throw new Error("Gemini JSON failed validation - missing required fields (verses, interpretation, or story)");
    }

    console.log('✅ Sermon generation successful!');
    return {
      verses: maybe.verses,
      interpretation: maybe.interpretation,
      story: maybe.story,
    } as Sermon;
  } catch (error) {
    console.error('❌ Error in generateSermon:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate sermon: ${String(error)}`);
  }
}

export async function generateMoodSermon(
  mood: MoodType,
  reason: string[],
  customReason?: string
): Promise<Sermon> {
  console.log('🔮 Starting mood-based sermon generation for mood:', mood);
  
  if (!GEMINI_API_KEY) {
    const error = "Missing EXPO_PUBLIC_GEMINI_API_KEY environment variable";
    console.error('❌', error);
    throw new Error(error);
  }

  const systemInstruction =
    "You are a compassionate Christian assistant that provides biblical encouragement and guidance. Return only valid JSON. Do not include any extra text."

  const reasonText = customReason 
    ? `${reason.join(', ')}, ${customReason}`
    : reason.join(', ');

  // Create context-aware prompt based on mood
  let moodContext = '';
  switch (mood) {
    case 'Happy':
      moodContext = 'celebrating joy and gratitude';
      break;
    case 'Grateful':
      moodContext = 'feeling thankful and blessed';
      break;
    case 'Hopeful':
      moodContext = 'seeking hope and encouragement';
      break;
    case 'Peaceful':
      moodContext = 'experiencing peace and contentment';
      break;
    case 'Anxious':
      moodContext = 'feeling anxious and needing peace';
      break;
    case 'Sad':
      moodContext = 'feeling sad and needing comfort';
      break;
    case 'Overwhelmed':
      moodContext = 'feeling overwhelmed and needing strength';
      break;
    case 'Angry':
      moodContext = 'feeling angry and needing guidance';
      break;
  }

  const prompt = `Return ONLY valid minified JSON with keys: verses (array of 2 strings), interpretation (string), story (string). Do not include markdown, code fences, or commentary. Example: {"verses":["...","..."],"interpretation":"...","story":"..."}. 

Create a biblical sermon and encouragement for someone who is ${moodContext} because of: ${reasonText}. Provide relevant Bible verses, a thoughtful interpretation that addresses their emotional state, and an inspiring story or example that relates to their situation.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  console.log('📤 Calling Gemini API for mood sermon:', apiUrl.replace(GEMINI_API_KEY, '***KEY***'));

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemInstruction }] },
          { role: "user", parts: [{ text: prompt }] },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }),
    });

    console.log('📥 Gemini API response status:', res.status, res.statusText);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Gemini API error response:', errorText);
      let errorMessage = `Gemini API error: ${res.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
      }
      throw new Error(errorMessage);
    }

    const result = await res.json();
    console.log('📦 Gemini API response structure:', {
      hasCandidates: !!result?.candidates,
      candidatesLength: result?.candidates?.length || 0,
    });

    const text: string | undefined = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('❌ Unexpected Gemini response format:', JSON.stringify(result, null, 2));
      throw new Error("Unexpected Gemini response format - no text content found");
    }

    console.log('📝 Raw Gemini response text (first 200 chars):', text.substring(0, 200));

    const trimmed = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
      console.log('✅ Successfully parsed JSON from Gemini response');
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Text that failed to parse:', trimmed.substring(0, 500));
      throw new Error(`Gemini returned non-JSON content: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    // Basic shape validation
    const maybe = json as Partial<Sermon>;
    if (!maybe || !Array.isArray(maybe.verses) || maybe.verses.length < 1 || !maybe.interpretation || !maybe.story) {
      console.error('❌ JSON validation failed:', {
        hasVerses: Array.isArray(maybe?.verses),
        versesLength: maybe?.verses?.length || 0,
        hasInterpretation: !!maybe?.interpretation,
        hasStory: !!maybe?.story,
        fullJson: JSON.stringify(maybe, null, 2),
      });
      throw new Error("Gemini JSON failed validation - missing required fields (verses, interpretation, or story)");
    }

    console.log('✅ Mood sermon generation successful!');
    return {
      verses: maybe.verses,
      interpretation: maybe.interpretation,
      story: maybe.story,
    } as Sermon;
  } catch (error) {
    console.error('❌ Error in generateMoodSermon:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate mood sermon: ${String(error)}`);
  }
}

