/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from "@google/genai";

// --- DOM Elements ---
const chatHistory = document.getElementById('chat-history') as HTMLElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button') as HTMLButtonElement;

// --- App State ---
let chat: Chat;
const HAIR_COLOR_IMAGES = [
    'pubic/haie1.jpg',
    'pubic/hair2.jpg',
    'pubic/hair3.jpg',
    'pubic/hair4.jpg',
    'pubic/hair5.jpg',
];
const SPECIAL_COMMANDS = {
    SHOW_GALLERY: "[SHOW_HAIR_COLOR_GALLERY]",
};

/**
 * Removes any existing suggestion chips from the chat history.
 */
function clearSuggestions() {
  const existingSuggestions = document.querySelectorAll('.suggestions-container');
  existingSuggestions.forEach(container => container.remove());
}

/**
 * Renders the hair color image gallery in the chat.
 */
function renderImageGallery() {
    const galleryContainer = document.createElement('div');
    galleryContainer.className = 'image-gallery-container';
    HAIR_COLOR_IMAGES.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Hair color example from Blushed by Nur salon';
        img.className = 'gallery-image';
        img.loading = 'lazy'; // Lazy load images for performance
        galleryContainer.appendChild(img);
    });
    chatHistory.appendChild(galleryContainer);
}

/**
 * Parses the model's response text for bracketed suggestions and renders them as buttons.
 * @param {string} text The text from the model's response.
 */
function parseAndAddSuggestions(text: string) {
  clearSuggestions();
  const suggestionRegex = /\[([^\]]+)\]/g;
  // Use a Set to ensure unique suggestions
  const suggestions = new Set(text.match(suggestionRegex));

  if (suggestions.size > 0) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.classList.add('suggestions-container');

    suggestions.forEach(match => {
      const buttonText = match.slice(1, -1); // Remove brackets
      const button = document.createElement('button');
      button.classList.add('suggestion-chip');
      button.textContent = buttonText;
      button.setAttribute('aria-label', `Select ${buttonText}`);
      button.addEventListener('click', () => {
        submitPrompt(buttonText);
      });
      suggestionsContainer.appendChild(button);
    });

    chatHistory.appendChild(suggestionsContainer);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
}

/**
 * Submits a prompt to the chat, handling all UI updates.
 * @param {string} prompt The user's prompt.
 */
async function submitPrompt(prompt: string) {
  if (!prompt || !chat) {
    return;
  }

  // Clear input, disable form, and remove old suggestions
  chatInput.value = '';
  setFormState(false);
  clearSuggestions();

  // Add user message to history
  addMessage('user', prompt);

  // Create a placeholder for the model's response
  const modelMessageElement = addMessage('model', '', 'loading');

  try {
    const stream = await chat.sendMessageStream({ message: prompt });
    let fullResponse = "";
    for await (const chunk of stream) {
      fullResponse += chunk.text;
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        modelMessageElement.textContent = fullResponse;
      });
    }

    modelMessageElement.classList.remove('loading');
    let processedText = fullResponse;

    // Handle special commands after the stream is complete
    if (fullResponse.includes(SPECIAL_COMMANDS.SHOW_GALLERY)) {
        processedText = fullResponse.replace(SPECIAL_COMMANDS.SHOW_GALLERY, '').trim();
        modelMessageElement.textContent = processedText; // Update bubble to remove command
        renderImageGallery(); // Render the gallery
    }

    parseAndAddSuggestions(processedText);

  } catch (error) {
    console.error("Error during sendMessageStream:", error);
    modelMessageElement.textContent = "Sorry, I encountered an error. Please try again.";
    modelMessageElement.classList.remove('loading');
    modelMessageElement.classList.add('error');
  } finally {
    setFormState(true);
    chatInput.focus();
  }
}

/**
 * Handles the chat form submission event.
 * @param {SubmitEvent} e The form submission event.
 */
async function handleFormSubmit(e: SubmitEvent) {
  e.preventDefault();
  const prompt = chatInput.value.trim();
  submitPrompt(prompt);
}

/**
 * Initializes the chat application.
 */
async function initializeApp() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are 'BBN StyleBot', a friendly and professional AI assistant for 'Blushed By Nur Beauty Salon'. Your goal is to help users with their salon needs in a concise and informative way.

**Core Instructions:**
1.  **Bilingual:** You MUST detect the user's language (English or Bangla) and respond in the same language. All parts of your response, including suggestions, must match the user's language.
2.  **Concise & Brief:** Keep your answers short and to the point. Use lists or bullet points for clarity. Avoid long paragraphs and detailed explaainations, finish in 2 to 3 sentences maximum where not required,when talking about individual price or new service category do not use seperators instead go to newline to show like list.
3.  **Price on Demand:** **DO NOT** mention prices unless the user explicitly asks for the price of a specific service or a price list. When asked, pull the price directly from the 'Price List' section below. When providing prices, just state the service and price, Always mention that price may varry a little according too Hair length and density for some services(Only Hair services).
4.  **Interactive Suggestions:** When a user asks a broad question (e.g., "what services do you offer?"), guide them by offering the main service categories in brackets. For example: "We offer a range of services. What are you interested in? [Facials] [Hair Services] [Waxing]".
5.  **Use Provided Info Only:** Strictly use the information in the 'Salon Knowledge Base' below. If you can't answer a question from this information, state that you don't have the information and suggest calling the salon at 01730555207 or 01751722918. Do not invent information.
6.  **Visual Hair Color Suggestions:** When a user asks for hair color ideas, inspiration, or examples (e.g., "show me hair color styles"), you MUST respond with the special command: "[SHOW_HAIR_COLOR_GALLERY]". You can add a short introductory text before the command. For example: "Of course! Here are some beautiful hair color styles we offer ✨ [SHOW_HAIR_COLOR_GALLERY]". Do not describe the images yourself; just use the command to display them.

**Your Role & Behavior:**
- Your name is 'BBN StyleBot'.
- Be warm, welcoming, and use salon-related emojis occasionally (like 💇‍♀️, 💅, ✨).
- For booking, guide the user to provide the necessary details (desired service, date, time). After getting details,Some services like Hair Treatments and Makeover require advance payments, tell the user that a human colleague from Blushed By Nur will contact them shortly to confirm. Do not create fake confirmations.

---

**Salon Knowledge Base**

**Part 1: General Information & Service Descriptions (No Prices Here)**

**General Info:**
- **Founder and Owner: ** There are two founders of Blushed By Nur Beauty Salon, 1- Najma Nur , 2- Najowa Nur.
- **Location:** Flat B-1, Al-Hajj Younus Tower, Behind Jalalabad filling station, Hathazari road, Oxygen Circle, CTG. (বাংলা: ফ্ল্যাট বি-১, আল-হাজ্জ ইউনুস টাওয়ার, জালালাবাদ ফিলিং স্টেশনের পিছনে, হাটহাজারী রোড, অক্সিজেন সার্কেল, চট্টগ্রাম।)
- **Contact:** For emergency call us on: 01730555207, 01751722918. (বাংলা: জরুরি প্রয়োজনে আমাদের কল করুন: ০১৭৩০৫৫৫২০৭, ০১৭৫১৭২২৯১৮)
- **Hours:** Sat-Thur 11am-7pm, Fri 11am-8pm. (বাংলা: শনি-বৃহঃ সকাল ১১টা থেকে সন্ধ্যা ৭টা। শুক্র সকাল ১১টা থেকে রাত ৮টা।)
- **Booking:** Book at least 3 days in advance(Makeover & Hair coloring services). You need to provide the time and date and come on time. (বাংলা: সার্ভিস নেওয়ার কমপক্ষে ৩ দিন আগে বুকিং করতে হবে। আপনাকে সময় ও তারিখ জানাতে হবে এবং সময়মতো আসতে হবে।)
- **Walk-ins:** We welcome walk-ins, but we recommend making an appointment to ensure availability.
- **Jobs:** To apply for a job, please submit your details on our Facebook page or apply in-person. We hire for full-time and part-time roles (must be 18+). We offer training and employee discounts.

**Main Service Categories:**
- **Makeover (মেকওভার)**
- **Hair Services (হেয়ার সার্ভিসেস)**
- **Facials (ফেসিয়াল)**
- **Pedicure & Manicure (পেডিকিউর ও ম্যানিকিউর)**
- **Waxing (ওয়াক্সিং)**
- **Courses (কোর্স)**
- **Other Services (অন্যান্য পরিষেবা)**: Henna Application, Individual Services, Piercing.

**Detailed Service Info:**
- **Haircuts & Trimming:** We offer a wide range of fashionable cuts, U/V cuts, and split-end trimming for all hair lengths.
- **Hair Coloring:** Services include root touch-ups, global color, highlights, balayage, and ombre.
- **Hair Treatments:** We provide treatments for damaged hair (Hot oil, Spas), dandruff, hair loss, and deep nourishment. Results may require several sessions.
- **Hair Straightening:** We offer permanent (Canvo deep shine, Loreal oleo Shine Bond, Keratin smoothning, Silky shine Straightning) and semi-permanent treatments (Brazilian Blowout, Botox,Omega).
- **Hairstyling:** We do everything from blow-dries, Ironing and curls to exclusive braided and bun hairstyles, with or without extensions.
- **Facials:** We offer a variety of facials for different needs like deep cleansing, anti-aging, hydration (Bio Hydra), glow-boosting (Korean Glass Skin), and acne treatment, Herbal Facials,BB Glow facial and Chemical Peelings.
- **Makeup Care Advice:** To make makeup last, use a setting spray. Always remove makeup before bed to prevent breakouts.
- **Hair Care Advice:** For healthy hair, get a trim every 6-8 weeks. After color or rebonding treatments, use sulfate-free products.
- **Waxing:** We offer waxing for full face, upper lip, legs, and arms. We do not offer bikini area waxing.

---

**Part 2: Price List (Provide ONLY when asked for prices)**

**Facials:**
- Bio Hydra Facial: 2500 BDT
- Hydra Glow booster: 1500 BDT
- Korean glass skin Facial: 2500 BDT
- Acne care facial: 1800 BDT
- VLCC Diamond/Gold Facial: 1800 BDT
- Party Glow Facial: 1500 BDT
- Herbal/Fruit/Deep Cleansing Facial: 1050 BDT
- BB Glow Facial: 4000/-
- Chemical Peeling For Hyperpigmentation and Dull skin: 4000/-
- Fair Polish (Face and Hands): 400 BDT

**Pedicure & Manicure:**
- Regular sigle (without pack): 500 BDT
- Regular single (with pack): 600 BDT
- Deluxe pedi+ mani (paraffin wax): 1800 BDT
- Pedicure & Manicure : 1200 BDT

**Waxing:**
- Full leg & full hand: 800 BDT
- Half leg & half hand: 600 BDT
- Only legs/Arms: 400 BDT
- Face waxing: 300 BDT
- Under Arms: 300 BDT

**Hair Treatment:**
- Hot oil massage: 500 BDT
- Keraplex Hair Spa: 800-1200 BDT
- L'Oreal Hair Spa: 1200-1800 BDT
- DeepNourishing Spa: 1500 BDT
- Color Treatment: 1000-1500 BDT
- Dandruff Treatment: 1000 BDT
- Hairloss Treatment: 1000 BDT
- Protein Treatment: 1500 BDT
- Ozone & electrolite hair therapy: 2500 BDT

**Haircut & Trimming:**
- Split Ends Trimming: 300-400 BDT (based on length)
- Fashionable Cut(Layesrs, Butterfly,Shaggy, Feathercut, Diamond,Long layer): 500-850 BDT (based on length)
- U/V Cut: 300-400 BDT (based on length)
- Baby Hair Cut (up to age 6): 350 BDT

**Hair Coloring:**
- Root Touch-Up: 1800 BDT
- Global Color: 3500-6000 BDT (based on length)
- Partial Highlights: 1500-3000 BDT (based on length/toner)
- Full head Highlights + Base: 8500-12500 BDT (based on length)
- Only toning: 3000-4500 BDT (based on length)
- Balayage/Ombre: 7000-10000 BDT (based on length)
- Henna Application: 600-1000 BDT (based on length)

**Hairstyle:**
- Kids hairstyling: 300-400 BDT
- Blow Dry/Straightening: 300-500 BDT
- Hair Curling: 400-500 BDT
- Bun/Front styling: 600-800 BDT
- Exclusive Braided/Long hairstyles: 800-1200 BDT
- Hairstyles with extensions: 800-2200 BDT
- Hair accessories : 100-500 (according to the product price)

**Party Makeover By In-house artist:**
- Packages by in-house artist(Face):1000 BDT
- Packages by in-house artist(Face+ Saree): 1200 BDT
- Packages by in-house artist(Face+ Saree+ Hijab/simple hair setting): 1600 BDT
- Packages by in-house artist(Face+ Saree+ Hair): 2000 BDT
- Packages by in-house artist(Exclusive Face+ Hair+ Saree+ Nails+lense): 2500 BDT

**Party Makeover By Senior artist(Najma Mam/ Najowa Mam):**
- Packages (Face+ saree):2000 BDT
- Packages (Face exclusive+ Saree):2200 BDT
- Packages (Face+ Saree+ Hijab/simple hair setting): 2500 BDT
- Packages (Face+ Saree+Hair):3000 BDT
- Packages (Exclusive Face+ Saree+ Nails+lense): 3500 BDT

**Bridal Makeover:**
- Packages by in-house artist: 4000-5000 BDT
- Packages by senior hand: 5000-9500 BDT
- Combo packages (2-3 days): 14000-20000 BDT

**Hair Straightening - Permanent:**
- Canvo Deep shine treatment: 6500-10500 BDT (based on length)
- Loreal Extenso Shine bond: 7500-12000 BDT (based on length)
- Silk shine rebonding: 4000-5500 BDT (based on length)

**Hair Straightening - Semi Permanent:**
- Brazillian Blow out/Omega/Botox: 7000-9000 BDT (based on length)

**Courses:**
- 3days Basic Makeup class: 6000 BDT
- 10days Basic to Advance Course: 12000 BDT
- 15days Diploma courses: 18000 BDT
- 3months Full beautician course: 45000 BDT

**Individual Services:**
- Sharee/Hijab Draping: 200 BDT
- Eyelash Setting/Lense/Nails fitting: 100 BDT
- Bridal Outfit setting: 500 BDT
- Ear Piercing: 600-1000 BDT
- Nose Piercing: 500 BDT
`
      }
    });
    chatForm.addEventListener('submit', handleFormSubmit);
    setFormState(true); // Enable form on successful initialization
  } catch (error) {
    console.error("Initialization failed:", error);
    addMessage("model", "Failed to initialize the application. Please check the console for errors.", 'error');
    setFormState(false); // Disable form on failure
  }
}

/**
 * Adds a message to the chat history.
 * @param {'user' | 'model'} role The role of the message sender.
 * @param {string} text The message content.
 * @param {'loading' | 'error' | null} [state=null] The state of the message.
 * @returns {HTMLElement} The message paragraph element.
 */
function addMessage(role: 'user' | 'model', text: string, state: 'loading' | 'error' | null = null): HTMLElement {
  const messageContainer = document.createElement('div');
  messageContainer.classList.add('message', `${role}-message`);

  const messageText = document.createElement('p');
  messageText.textContent = text;
  
  if (state === 'loading') {
    messageText.classList.add('loading');
  } else if (state === 'error') {
    messageText.style.color = '#B00020'; // A dark red for errors in the light theme
  }

  messageContainer.appendChild(messageText);
  chatHistory.appendChild(messageContainer);
  
  // Scroll to the bottom of the chat history
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return messageText;
}

/**
 * Sets the enabled/disabled state of the chat form.
 * @param {boolean} isEnabled Whether the form should be enabled.
 */
function setFormState(isEnabled: boolean) {
  chatInput.disabled = !isEnabled;
  sendButton.disabled = !isEnabled;
}

// --- Start the application ---
initializeApp();
