---
title: Speech Customization
subtitle: >-
  Discover how to adjust voice settings to create a distinctive and expressive
  voice for your application.
---

Murf's AI models not only generate natural-sounding speech quickly but also give you powerful customization controls to shape the output with precision and personality. Through intuitive controls, you can fine-tune every detail to bring your creative vision to life.

## Voices

Murf offers a diverse collection of **150+ AI voices** across different accents, genders, and speaking styles—designed to suit a wide range of use cases from narration and marketing to training and conversation. The `voiceId` key is a **required parameter** in the [Synthesis Speech](/api/docs/api-reference/text-to-speech/generate) operation’s request body and must be provided to specify which voice should be used to generate the audio output. Each voice comes with its own unique tonal profile and supports different features such as [styles](#styles) and [multi-native locales](#multinative).

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="What color is the sky?",
    voice_id="en-US-ariana",
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "¡Ay, mi amor! ¡Ay, mi amor!",
  voiceId: "es-MX-valeria",
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "du sagst mir, dass es rot ist",
  "voiceId": "de-DE-matthias"
}'
```

</CodeBlocks>

<Card
  icon="fa-light fa-waveform-lines"
  title="Find your Perfect Voice"
  href="https://murf.ai/api/products/text-to-speech/Falcon?utm_source=murf_api_docs"
>
  Explore, preview, and select from 150+ voices in 20+ expressive styles
</Card>


## Styles

Murf Styles enable developers to fine-tune voice output for different contexts. Each voice supports multiple predefined styles that modify tone, emotional inflection, and delivery patterns. By passing the style parameter, you can programmatically transform a neutral voice to match specific contexts such as promotional, newscast, conversational, or inspirational to meet your application's delivery requirements.

Here are some examples of different styles available in the Murf API:

<CardGroup col={2}>
  <Card title="Sad">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/styles/ken-sad-1.wav"
    />
  </Card>
  <Card title="Angry">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/styles/ken-angry-1.wav"
    />
  </Card>
</CardGroup>

Use the `style` key to select which style to use for your audio generation.

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="Oh! I'll have to do this all over again.",
    voice_id="en-US-ken",
    style="Angry"
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "Oh! I'll have to do this all over again.",
  voiceId: "en-US-ken",
  style: "Angry",
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "Oh! I'll have to do this all over again.",
  "voiceId": "en-US-ken",
  "style": "Angry"
}'
```

</CodeBlocks>

You can explore all supported styles and hear audio samples in our [Voice Library](/api/docs/voices-styles/voice-library).


## Pronunciations

While our models are capable at handling complex pronunciations of heteronyms, acronyms, numbers, and proper nouns, you might sometimes need a specific pronunciation for certain words. Our custom pronunciation feature lets you adjust how words are spoken to perfectly match your context or accent preferences.

Here are a few examples of words and how they sound before and after adding custom pronunciations:

<div>
  <strong>wound (wuːnd vs waʊnd)</strong>
  <CardGroup col={2}>
    <Card>
      <audio
        controls
        src="https://murf.ai/public-assets/Blog/2023/010223/SubBlock_Wound_before_P.mp3"
      />
    </Card>
    <Card>
      <audio
        controls
        src="https://murf.ai/public-assets/Blog/2023/010223/Block_Wound.mp3"
      />
    </Card>
  </CardGroup>
</div>
<div>
  <strong>2010 (twenty ten vs two thousand and ten)</strong>
  <CardGroup col={2}>
    <Card>
      <audio
        controls
        src="https://murf.ai/public-assets/misc/example_audio/voices/pronunciation/twenty-ten-charles.wav"
      />
    </Card>
    <Card>
      <audio
        controls
        src="https://murf.ai/public-assets/misc/example_audio/voices/pronunciation/twothousandandten-charles.wav"
      />
    </Card>
  </CardGroup>
</div>

The `pronunciationDictionary` key in [Synthesize Speech](/api/docs/api-reference/text-to-speech/generate) operation's request body is used to specify custom pronunciations.

You can specify custom pronunciations as an IPA or an alternate word. IPA is an internationally recognized set of phonetic symbols based on the principle of strict one-to-one correspondence between sounds and symbols.

Pronunciations are specified in a key-value pair format, where the key is the word that needs to be changed, and the value is an object that specifies the pronunciation type and value.

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="The 2010 world cup was held in South Africa",
    voice_id="en-US-natalie",
    pronunciation_dictionary={
        "live": { "type": "IPA", "pronunciation": "laɪv" },
        "2010": { "type": "SAY_AS", "pronunciation": "two thousand and ten" }
    }
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "The 2010 world cup was held in South Africa",
  voiceId: "en-US-natalie",
  pronunciationDictionary: {
    live: { type: "IPA", pronunciation: "laɪv" },
    2010: { type: "SAY_AS", pronunciation: "two thousand and ten" },
  },
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "The 2010 world cup was held in South Africa",
  "voiceId": "en-US-natalie",
  "pronunciationDictionary": {
    "live": { "type": "IPA", "pronunciation": "laɪv" },
    "2010": { "type": "SAY_AS", "pronunciation": "two thousand and ten" }
  }
}'
```

</CodeBlocks>


## Multilingual

Multilingual voices enable text-to-speech synthesis that sounds authentically native across multiple languages. This allows you to use the same voice which can speak multiple languages while preserving natural pronunciation patterns specific to each language, effectively eliminating the "foreign accent" effect common in conventional Multilingual TTS systems.

<div>
  <strong>For example - "Croissant" in English & French</strong>
  <CardGroup col={2}>
    <Card title="Without Multilingual Locale">
      <audio
        controls
        src="https://murf.ai/public-assets/misc/example_audio/voices/multi-native/natalie-croissant-en-US.wav"
      />
    </Card>
    <Card title="With Multilingual Locale">
      <audio
        controls
        src="https://murf.ai/public-assets/misc/example_audio/voices/multi-native/natalie-croissant-fr-FR.wav"
      />
    </Card>
  </CardGroup>
</div>

Use the `multiNativeLocale` key to select which locale to use for your audio generation.

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="Croissant",
    voice_id="en-US-natalie",
    multi_native_locale="fr-FR"
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "Croissant",
  voiceId: "en-US-natalie",
  multiNativeLocale: "fr-FR",
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "Croissant",
  "voiceId": "en-US-natalie",
  "multiNativeLocale": "fr-FR"
}'
```

</CodeBlocks>

<Note>
  Make sure the locale that you send in `multiNativeLocale` is supported by your
  chosen voice. You can see the list of supported locales for each voice in the
  [Voice Library](/api/docs/voices-styles/voice-library).
</Note>


## Pauses

Our models are capable of adding natural pauses based on the text and context. In some cases, you may want to adjust the pause duration between two words to achieve the desired effect in your speech.

<Card>
  <audio
    controls
    src="https://murf.ai/public-assets/misc/example_audio/voices/pause/pause-1s-terrell.wav"
  />
</Card>

In the [Synthesize Speech](/api/docs/api-reference/text-to-speech/generate) operation, the text key of the request body holds the text to be synthesized. This text key can be tweaked to add a pause between words in your script. This is done using Murf's pause syntax: `[pause <duration>]`.

Specify how long you want the pause to be in seconds by replacing the `<duration>` part of the syntax, and you'll get silence for that duration in the generated voiceover. The pause duration can be between 0.1s to 5s.

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="The answer to the problem was [pause 1s] patience.",
    voice_id="en-US-terrell"
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "The answer to the problem was [pause 1s] patience.",
  voiceId: "en-US-terrell",
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "The answer to the problem was [pause 1s] patience.",
  "voiceId": "en-US-terrell"
}'
```

</CodeBlocks>

<Note> The `[pause <duration>]` tag is currently supported only in the **Synthesize Speech** operation. The **Stream Speech** operation does not support custom pause tags, it automatically adds natural pauses based on the text and context. </Note>


## Audio Duration

The `audioDuration` key in [Synthesize Speech](/api/docs/api-reference/text-to-speech/generate) operation’s request body lets you specify the desired length of the generated audio (in seconds), and the system adjusts the speech to fit this duration.

Here is an example of how audio duration helps in generating voiceovers of specific lengths:

<Card title="Default (7s)">
  <audio
    controls
    src="https://murf.ai/public-assets/misc/example_audio/voices/duration/miles-sports1-duration-7.wav"
  />
</Card>

<CardGroup col={2}>
  <Card title="Faster (6s)">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/duration/miles-sports1-duration-6.wav"
    />
  </Card>
  <Card title="Slower (8s)">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/duration/miles-sports1-duration-8.wav"
    />
  </Card>
</CardGroup>

This can be useful for matching voiceovers with specific audio lengths or other time constraints. The system will try to match the duration of the generated audio to `audioDuration` as closely as possible.

If there’s a significant difference between the requested and actual duration, consider changing the text length or `audioDuration` value for better alignment.

- **Valid values**: A double value representing the time in seconds.
- **Guideline**: As a rule of thumb. ~150 words/1000 characters of text generates around 60 seconds of audio.
- **Availability**: Supported only in the Synthesize Speech operation for the Gen2 model.

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="The team is down by three points. Ten seconds left on the clock! The next play could decide the game",
    voice_id="en-US-miles",
    audio_duration=8.0
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "The team is down by three points. Ten seconds left on the clock! The next play could decide the game",
  voiceId: "en-US-miles",
  audioDuration: 8.0,
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "The team is down by three points. Ten seconds left on the clock! The next play could decide the game",
  "voiceId": "en-US-miles",
  "audioDuration": 8.0
}'
```

</CodeBlocks>


## Speed

The `rate` key in the [Synthesize Speech](/api/docs/api-reference/text-to-speech/generate) operation’s request body controls the speed at which the voice speaks. Adjusting this parameter lets you make the voice output faster or slower.

**Higher values mean higher speed**, and lower values slow down the speech.

- **Valid values**: Any integer between -50 and 50
- **Default value**: 0

<CardGroup col={2}>
  <Card title="Default">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/speed-pitch/speed-pitch-ken-normal.wav"
    />
  </Card>
  <Card title="High Speed">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/speed-pitch/speed-ken-fast.wav"
    />
  </Card>
</CardGroup>

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="I can't believe it! Is that really you captain?",
    voice_id="en-US-ken",
    rate=10
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "I can't believe it! Is that really you captain?",
  voiceId: "en-US-ken",
  rate: 10,
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "I can't believe it! Is that really you captain?",
  "voiceId": "en-US-ken",
  "rate": 10
}'
```

</CodeBlocks>

## Pitch

The `pitch` key controls the tone or frequency of the generated voice. Increasing the pitch makes the voice sound higher (more treble), while decreasing it results in a deeper (more bass) voice.

- **Valid values**: Any integer between -50 and 50
- **Default value**: 0

<CardGroup col={2}>
  <Card title="Default">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/speed-pitch/speed-pitch-ken-normal.wav"
    />
  </Card>
  <Card title="Low Pitch">
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/speed-pitch/pitch-ken-low.wav"
    />
  </Card>
</CardGroup>

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="I can't believe it! Is that really you captain?",
    voice_id="en-US-ken",
    pitch=-10
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "I can't believe it! Is that really you captain?",
  voiceId: "en-US-ken",
  pitch: -10,
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "I can't believe it! Is that really you captain?",
  "voiceId": "en-US-ken",
  "pitch": -10
}'
```

</CodeBlocks>


## Variations

Variations allows you to generate voiceover using three primary parameters: pause, pitch, and speed. A higher variation value results in a more dynamic voice output, incorporating changes in speech delivery, pitch shifts, and pauses to make the audio sound more natural and less robotic.

**Variation 1**

<Card>
  <audio
    controls
    src="https://murf.ai/public-assets/misc/example_audio/voices/variations/julia-variation1-1.wav"
  />
</Card>

**Variation 5**

<CardGroup col={2}>
  <Card>
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/variations/julia-variation5-1.wav"
    />
  </Card>
  <Card>
    <audio
      controls
      src="https://murf.ai/public-assets/misc/example_audio/voices/variations/julia-variation5-2.wav"
    />
  </Card>
</CardGroup>

Increasing the value will add more variation in voice style, with noticeable shifts in pause, pitch, and speed

- **Valid values**: An integer between 0 and 5
- **Default value**: 1
- **Availability**: Only available for the Gen2 model

<CodeBlocks>

```python title="Python SDK"

from murf import Murf
client = Murf()
res = client.text_to_speech.generate(
    text="And off they went. Gently walking into the sunset, with not a single care in the world",
    voice_id="en-US-julia",
    variation=5
)

```

```javascript title="Javascript"
import axios from "axios";

const data = {
  text: "And off they went. Gently walking into the sunset, with not a single care in the world",
  voiceId: "en-US-julia",
  variation: 5,
};
axios
  .post("https://api.murf.ai/v1/speech/generate", data, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-key": process.env.MURF_API_KEY,
    },
  })
  .then((response) => {
    console.log(response.data.audioFile);
  });
```

```curl title="curl"
curl -X POST https://api.murf.ai/v1/speech/generate \
     -H "api-key: $MURF_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
  "text": "And off they went. Gently walking into the sunset, with not a single care in the world",
  "voiceId": "en-US-julia",
  "variation": 5
}'
```

</CodeBlocks>

---
subtitle: Process your voice data in region-specific environments with Murf Falcon TTS.
description: Process your voice data in region-specific environments with Murf Falcon TTS.
---

## Overview

Murf offers **data residency** through isolated regional environments for the streaming & websocket TTS API. Enterprise customers can choose where text and audio are processed, helping meet regulatory, contractual, or internal governance requirements—while still delivering ~130 ms latency.

**Important choice:**

- **Use a regional endpoint** when you need **strict data residency**.
- **Use the global router** when you want **best-effort low latency for a worldwide audience** (traffic is routed to a nearby region and may cross borders).

<Note>Data residency is only available for the Falcon TTS model.</Note>

## Regional vs Global: which should you use?

#### Regional endpoints (strict control - recommended for residency)

- By default, all customer account data (including user profiles, usage, and billing information) is hosted in the United States. However, with data residency enabled, text input, audio synthesis, and processing will be confined to the selected regional environment.
- Ideal for regulated workloads and contractual residency requirements.

#### Global router (latency-first - not for strict residency)

- `https://global.api.murf.ai/v1/speech/stream` automatically routes requests to an available, geographically close Falcon region for performance and availability.

- Because routing can select any available region, do not use the global URL if you require strict residency.

## Available Regions

Murf offers data residency for Falcon TTS in **11 regional environments**:

| Region (City/Area)        | Endpoint                                          |
| ------------------------- | ------------------------------------------------- |
| US-East                   | `https://us-east.api.murf.ai/v1/speech/stream`    |
| US-West                   | `https://us-west.api.murf.ai/v1/speech/stream`    |
| India                     | `https://in.api.murf.ai/v1/speech/stream`         |
| Canada                    | `https://ca.api.murf.ai/v1/speech/stream`         |
| South Korea               | `https://kr.api.murf.ai/v1/speech/stream`         |
| UAE                       | `https://me.api.murf.ai/v1/speech/stream`         |
| Japan                     | `https://jp.api.murf.ai/v1/speech/stream`         |
| Australia                 | `https://au.api.murf.ai/v1/speech/stream`         |
| EU (Central)              | `https://eu-central.api.murf.ai/v1/speech/stream` |
| UK                        | `https://uk.api.murf.ai/v1/speech/stream`         |
| South America (São Paulo) | `https://sa-east.api.murf.ai/v1/speech/stream`    |

## Access and Concurrency Rules

| Plan Type                 | API Key Usage                | Concurrency                                               |
| ------------------------- | ---------------------------- | --------------------------------------------------------- |
| Free Tier & Pay as You Go | Same API key for all regions | 15 for US-East and 2 concurrent request for other regions |
| Enterprise                | Same API key for all regions | Custom per region                                         |

**Note** : Even with data residency enabled, your Murf account metadata (e.g., profile, usage stats) will continue to be stored in the United States. However, **your input text, generated audio, and intermediate processing data will remain within your chosen regional environment**.

## Developer Integration

When using data residency, simply call the regional endpoint that corresponds to your desired jurisdiction.

#### Example:

<CodeBlocks>

```python title="Python"
import requests

# Global URL
response = requests.post(
    "https://global.api.murf.ai/v1/speech/stream",
    headers={"api-key": "<YOUR_API_KEY>"},
    json={
        "text": "Hi, How are you doing today?",
        "model": "FALCON",
        "voiceId": "Matthew",
        "multiNativeLocale": "en-US"
    },
    stream=True
)
with open("global_audio.mp3", "wb") as f:
    for chunk in response.iter_content(chunk_size=1024):
        f.write(chunk)

#  Regional URL
response_india = requests.post(
     "https://in.api.murf.ai/v1/speech/stream",
     headers={"api-key": "<YOUR_API_KEY>"},
     json={
         "text": "Hi, How are you doing today?",
         "model": "FALCON",
         "voiceId": "Matthew",
         "multiNativeLocale": "en-US"
     },
     stream=True
 )
with open("india_audio.mp3", "wb") as f:
     for chunk in response_india.iter_content(chunk_size=1024):
         f.write(chunk)


```

```javascript title="Javascript"
import axios from "axios";

// Global URL
axios
  .post(
    "https://global.api.murf.ai/v1/speech/stream",
    {
      text: "Hi, How are you doing today?",
      voiceId: "Matthew",
      multiNativeLocale: "en-US",
      model: "FALCON",
    },
    {
      headers: {
        "api-key": `<YOUR_API_KEY>`,
      },
    }
  )
  .then((response) => console.log(response.data))
  .catch((error) => console.error("Error:", error));

// Regional URL
axios
  .post(
    "https://in.api.murf.ai/v1/speech/stream",
    {
      text: "Hi, How are you doing today?",
      voiceId: "Matthew",
      multiNativeLocale: "en-US",
      model: "FALCON",
    },
    {
      headers: {
        "api-key": `<YOUR_API_KEY>`,
      },
    }
  )
  .then((response) => console.log(response.data))
  .catch((error) => console.error("Error:", error));
```

```curl title="curl"
# Global URL
curl -X POST https://global.api.murf.ai/v1/speech/stream \
  -H "Content-Type: application/json" \
  -H "api-key: <YOUR_API_KEY>" \
  -d '{"text": "Hi, How are you doing today?", "model": "FALCON", "voiceId": "Matthew", "multiNativeLocale":"en-US"}'

# Eg : Regional URL
curl -X POST https://in.api.murf.ai/v1/speech/stream \
  -H "Content-Type: application/json" \
  -H "api-key: <YOUR_API_KEY>" \
  -d '{"text": "Hi, How are you doing today?", "model": "FALCON", "voiceId": "Matthew", "multiNativeLocale":"en-US"}'
```

</CodeBlocks>

For Enterprise customers, region-specific API keys will be provisioned by your Murf account manager.

## Data Residency Architecture

With Murf’s isolated Falcon TTS environments:

- **Text and audio data** remain confined to the selected region for processing.
- **Customer account and billing data** are centralized in the United States.
- **Network routing** ensures requests to regional URLs stay within that jurisdiction.
- **Encryption in transit** is maintained globally via HTTPS.

This architecture balances regulatory **compliance**, **latency optimization**, and **operational transparency**.

## Compliance & Security

Data residency environments extend Murf’s core security and compliance framework, including:

- **GDPR Readiness** : Murf’s processing framework aligns with GDPR’s regional data processing requirements.
- **SOC 2 Compliance** : Murf follows strict standards for data confidentiality, availability, and integrity.
- **Encryption at Rest & In Transit** : All content is encrypted using industry-standard AES-256 and TLS 1.2+.
- **Region-Specific Isolation** : Enterprise accounts can restrict Falcon TTS processing to a specific jurisdiction.

## FAQ

<AccordionGroup>
  <Accordion title="Can I access multiple regional environments with one key?">
    Free and Pay As You Go users can access any Falcon TTS regional URL using the same key, see Concurrency Limits [here](/text-to-speech/data-residency#access-and-concurrency-rules). Enterprise customers receive unique keys for each region, which support custom concurrency limits.
  </Accordion>
  <Accordion title="Where is my account and usage data stored?">
    All account-related data, including user profiles, consumption, and billing information, is stored in the United States. Only text and audio processing data are confined to the selected regional environment.
  </Accordion>
  <Accordion title="Does data residency improve latency?">
    Yes, in many cases. Running processing closer to your geographic location can reduce latency and improve response times by 100ms-250ms.
  </Accordion>
  <Accordion title="Can I run multiple residency regions simultaneously?">
    Yes. Enterprise customers can operate in multiple regions at the same time, each with separate API keys and concurrency configurations.
  </Accordion>
  <Accordion title="Is data residency available for all Murf APIs?">
    No. Currently, data residency is available only for the Falcon TTS API.
  </Accordion>
  <Accordion title="Is this feature available to all customers?">
    Yes. Data residency is available to all customers on regional URLs.
  </Accordion>
  <Accordion title="Can I request a new residency region?">
    Yes. Enterprise customers with specific compliance or operational needs can [contact us](https://murf.ai/enterprise?src=d_contact_sales_api_docs) to discuss adding new regional options.
  </Accordion>

</AccordionGroup>
Murf provides dedicated request capacity based on your plan. Each plan includes specific limits for concurrency and WebSocket connections. As your application scales, you can upgrade your plan to increase capacity.

Below is a summary of the concurrent TTS request limits for each plan:

| Model              | Free tier | Pay as you go | Enterprise |
| ---------------- | ------------------------- | --------------------- | --------------------- |
| Falcon       | 5 for US-East; <br></br><br></br>2 for global and regional endpoints                        | 15 for US-East; <br></br><br></br> 2 for global and regional endpoints                    | Custom Support Upto 10,000 concurrent calls                   |
| Gen2         | 5                        | 15                     | Custom support  |

### Concurrency for Non-Streaming requests

Concurrency refers to the maximum number of generation requests that can be processed simultaneously. For all non-streaming endpoints, this is defined as the number of active requests at any given time.

### Concurrency for Streaming requests

Our TTS API supports streaming via both HTTP and WebSocket connections. Concurrency for streaming is defined by the number of unique context IDs active at a given time:

1. HTTP Streaming: Each request is treated as a unique context ID and counts toward your concurrency limit.
2. WebSocket Streaming: Each unique context ID also counts toward your concurrency limit. Thus, when additional requests are sent with the same context_id, it does not increase your concurrency usage. This is because requests to the same context are processed sequentially. If no context ID is provided for request with websocket connection, we create null context ID and count it towards one concurrency.

If the number of active contexts exceeds your concurrency limit, new context IDs will be rejected, and an error message will be returned.

### WebSocket Limits

WebSocket limits define the number of parallel WebSocket connections allowed at given time. Each plan supports up to **10X the streaming concurrency** limit in parallel WebSocket connections.

- Each WebSocket connection closes automatically after 3 minutes of inactivity.
- If you attempt to open a new WebSocket connection after exceeding your limit, an error will be returned.

## Why These Limits Matter

The limits are designed to maintain system performance and ensure a consistent experience for all users. By adhering to the limits and following best practices, you can integrate the Murf API smoothly and efficiently into your applications.
If you have additional questions or need guidance on managing API limits, please drop a message in [our discord channel](https://discord.gg/FQVzyvqaVg) or contact our support team.

# Synthesize Speech

POST https://api.murf.ai/v1/speech/generate
Content-Type: application/json

Returns a url to the generated audio file along with other associated properties.

Reference: https://murf.ai/api/docs/api-reference/text-to-speech/generate

## OpenAPI Specification

```yaml
openapi: 3.1.1
info:
  title: Synthesize Speech
  version: endpoint_textToSpeech.generate
paths:
  /v1/speech/generate:
    post:
      operationId: generate
      summary: Synthesize Speech
      description: >-
        Returns a url to the generated audio file along with other associated
        properties.
      tags:
        - - subpackage_textToSpeech
      parameters:
        - name: api-key
          in: header
          required: false
          schema:
            type: string
      responses:
        '200':
          description: Ok
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GenerateSpeechResponse'
        '400':
          description: Bad Request
          content: {}
        '402':
          description: Expired subscription or character limit exhausted
          content: {}
        '403':
          description: Invalid or expired token/api-key provided
          content: {}
        '500':
          description: Internal Server Error
          content: {}
        '503':
          description: Service Unavailable
          content: {}
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/GenerateSpeechRequest'
components:
  schemas:
    GenerateSpeechRequestModelVersion:
      type: string
      enum:
        - value: GEN2
    PronunciationDetailType:
      type: string
      enum:
        - value: IPA
        - value: SAY_AS
    PronunciationDetail:
      type: object
      properties:
        pronunciation:
          type: string
        type:
          $ref: '#/components/schemas/PronunciationDetailType'
    GenerateSpeechRequest:
      type: object
      properties:
        audioDuration:
          type: number
          format: double
        channelType:
          type: string
        encodeAsBase64:
          type: boolean
        format:
          type: string
        modelVersion:
          $ref: '#/components/schemas/GenerateSpeechRequestModelVersion'
        multiNativeLocale:
          type: string
        pitch:
          type: integer
        pronunciationDictionary:
          type: object
          additionalProperties:
            $ref: '#/components/schemas/PronunciationDetail'
        rate:
          type: integer
        sampleRate:
          type: number
          format: double
        style:
          type: string
        text:
          type: string
        variation:
          type: integer
        voiceId:
          type: string
        wordDurationsAsOriginalText:
          type: boolean
      required:
        - text
        - voiceId
    WordDurationResponse:
      type: object
      properties:
        endMs:
          type: integer
        pitchScaleMaximum:
          type: number
          format: double
        pitchScaleMinimum:
          type: number
          format: double
        sourceWordIndex:
          type: integer
        startMs:
          type: integer
        word:
          type: string
    GenerateSpeechResponse:
      type: object
      properties:
        audioFile:
          type: string
          format: url
        audioLengthInSeconds:
          type: number
          format: double
        consumedCharacterCount:
          type: integer
          format: int64
        encodedAudio:
          type: string
        remainingCharacterCount:
          type: integer
          format: int64
        warning:
          type: string
        wordDurations:
          type: array
          items:
            $ref: '#/components/schemas/WordDurationResponse'
      required:
        - audioFile
        - audioLengthInSeconds
        - remainingCharacterCount
        - wordDurations

```

## SDK Code Examples

```python Pronunciation
from murf import Murf, PronunciationDetail

client = Murf(
    api_key="YOUR_API_KEY",
)
client.text_to_speech.generate(
    pronunciation_dictionary={
        "2010": PronunciationDetail(
            pronunciation="two thousand and ten",
            type="SAY_AS",
        ),
        "live": PronunciationDetail(
            pronunciation="laɪv",
            type="IPA",
        ),
    },
    text="The 2010 world cup was held in South Africa",
    voice_id="en-US-natalie",
)

```

```javascript Pronunciation
const url = 'https://api.murf.ai/v1/speech/generate';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: '{"text":"The 2010 world cup was held in South Africa","voiceId":"en-US-natalie","pronunciationDictionary":{"2010":{"pronunciation":"two thousand and ten","type":"SAY_AS"},"live":{"pronunciation":"laɪv","type":"IPA"}}}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Pronunciation
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.murf.ai/v1/speech/generate"

	payload := strings.NewReader("{\n  \"text\": \"The 2010 world cup was held in South Africa\",\n  \"voiceId\": \"en-US-natalie\",\n  \"pronunciationDictionary\": {\n    \"2010\": {\n      \"pronunciation\": \"two thousand and ten\",\n      \"type\": \"SAY_AS\"\n    },\n    \"live\": {\n      \"pronunciation\": \"laɪv\",\n      \"type\": \"IPA\"\n    }\n  }\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Pronunciation
require 'uri'
require 'net/http'

url = URI("https://api.murf.ai/v1/speech/generate")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = 'application/json'
request.body = "{\n  \"text\": \"The 2010 world cup was held in South Africa\",\n  \"voiceId\": \"en-US-natalie\",\n  \"pronunciationDictionary\": {\n    \"2010\": {\n      \"pronunciation\": \"two thousand and ten\",\n      \"type\": \"SAY_AS\"\n    },\n    \"live\": {\n      \"pronunciation\": \"laɪv\",\n      \"type\": \"IPA\"\n    }\n  }\n}"

response = http.request(request)
puts response.read_body
```

```java Pronunciation
HttpResponse<String> response = Unirest.post("https://api.murf.ai/v1/speech/generate")
  .header("Content-Type", "application/json")
  .body("{\n  \"text\": \"The 2010 world cup was held in South Africa\",\n  \"voiceId\": \"en-US-natalie\",\n  \"pronunciationDictionary\": {\n    \"2010\": {\n      \"pronunciation\": \"two thousand and ten\",\n      \"type\": \"SAY_AS\"\n    },\n    \"live\": {\n      \"pronunciation\": \"laɪv\",\n      \"type\": \"IPA\"\n    }\n  }\n}")
  .asString();
```

```php Pronunciation
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.murf.ai/v1/speech/generate', [
  'body' => '{
  "text": "The 2010 world cup was held in South Africa",
  "voiceId": "en-US-natalie",
  "pronunciationDictionary": {
    "2010": {
      "pronunciation": "two thousand and ten",
      "type": "SAY_AS"
    },
    "live": {
      "pronunciation": "laɪv",
      "type": "IPA"
    }
  }
}',
  'headers' => [
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp Pronunciation
var client = new RestClient("https://api.murf.ai/v1/speech/generate");
var request = new RestRequest(Method.POST);
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"text\": \"The 2010 world cup was held in South Africa\",\n  \"voiceId\": \"en-US-natalie\",\n  \"pronunciationDictionary\": {\n    \"2010\": {\n      \"pronunciation\": \"two thousand and ten\",\n      \"type\": \"SAY_AS\"\n    },\n    \"live\": {\n      \"pronunciation\": \"laɪv\",\n      \"type\": \"IPA\"\n    }\n  }\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Pronunciation
import Foundation

let headers = ["Content-Type": "application/json"]
let parameters = [
  "text": "The 2010 world cup was held in South Africa",
  "voiceId": "en-US-natalie",
  "pronunciationDictionary": [
    "2010": [
      "pronunciation": "two thousand and ten",
      "type": "SAY_AS"
    ],
    "live": [
      "pronunciation": "laɪv",
      "type": "IPA"
    ]
  ]
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.murf.ai/v1/speech/generate")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

```python Different output formats
from murf import Murf

client = Murf(
    api_key="YOUR_API_KEY",
)
client.text_to_speech.generate(
    format="MP3",
    sample_rate=44100.0,
    text="Hi, How are you doing today?",
    voice_id="en-US-natalie",
)

```

```javascript Different output formats
const url = 'https://api.murf.ai/v1/speech/generate';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: '{"text":"Hi, How are you doing today?","voiceId":"en-US-natalie","format":"MP3","sampleRate":44100}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go Different output formats
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.murf.ai/v1/speech/generate"

	payload := strings.NewReader("{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\",\n  \"format\": \"MP3\",\n  \"sampleRate\": 44100\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby Different output formats
require 'uri'
require 'net/http'

url = URI("https://api.murf.ai/v1/speech/generate")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = 'application/json'
request.body = "{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\",\n  \"format\": \"MP3\",\n  \"sampleRate\": 44100\n}"

response = http.request(request)
puts response.read_body
```

```java Different output formats
HttpResponse<String> response = Unirest.post("https://api.murf.ai/v1/speech/generate")
  .header("Content-Type", "application/json")
  .body("{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\",\n  \"format\": \"MP3\",\n  \"sampleRate\": 44100\n}")
  .asString();
```

```php Different output formats
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.murf.ai/v1/speech/generate', [
  'body' => '{
  "text": "Hi, How are you doing today?",
  "voiceId": "en-US-natalie",
  "format": "MP3",
  "sampleRate": 44100
}',
  'headers' => [
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp Different output formats
var client = new RestClient("https://api.murf.ai/v1/speech/generate");
var request = new RestRequest(Method.POST);
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\",\n  \"format\": \"MP3\",\n  \"sampleRate\": 44100\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift Different output formats
import Foundation

let headers = ["Content-Type": "application/json"]
let parameters = [
  "text": "Hi, How are you doing today?",
  "voiceId": "en-US-natalie",
  "format": "MP3",
  "sampleRate": 44100
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.murf.ai/v1/speech/generate")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```

```python
from murf import Murf

client = Murf(
    api_key="YOUR_API_KEY",
)
client.text_to_speech.generate(
    text="Hi, How are you doing today?",
    voice_id="en-US-natalie",
)

```

```javascript
const url = 'https://api.murf.ai/v1/speech/generate';
const options = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: '{"text":"Hi, How are you doing today?","voiceId":"en-US-natalie"}'
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  console.log(data);
} catch (error) {
  console.error(error);
}
```

```go
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.murf.ai/v1/speech/generate"

	payload := strings.NewReader("{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\"\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.murf.ai/v1/speech/generate")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Content-Type"] = 'application/json'
request.body = "{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\"\n}"

response = http.request(request)
puts response.read_body
```

```java
HttpResponse<String> response = Unirest.post("https://api.murf.ai/v1/speech/generate")
  .header("Content-Type", "application/json")
  .body("{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\"\n}")
  .asString();
```

```php
<?php

$client = new \GuzzleHttp\Client();

$response = $client->request('POST', 'https://api.murf.ai/v1/speech/generate', [
  'body' => '{
  "text": "Hi, How are you doing today?",
  "voiceId": "en-US-natalie"
}',
  'headers' => [
    'Content-Type' => 'application/json',
  ],
]);

echo $response->getBody();
```

```csharp
var client = new RestClient("https://api.murf.ai/v1/speech/generate");
var request = new RestRequest(Method.POST);
request.AddHeader("Content-Type", "application/json");
request.AddParameter("application/json", "{\n  \"text\": \"Hi, How are you doing today?\",\n  \"voiceId\": \"en-US-natalie\"\n}", ParameterType.RequestBody);
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["Content-Type": "application/json"]
let parameters = [
  "text": "Hi, How are you doing today?",
  "voiceId": "en-US-natalie"
] as [String : Any]

let postData = JSONSerialization.data(withJSONObject: parameters, options: [])

let request = NSMutableURLRequest(url: NSURL(string: "https://api.murf.ai/v1/speech/generate")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "POST"
request.allHTTPHeaderFields = headers
request.httpBody = postData as Data

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```