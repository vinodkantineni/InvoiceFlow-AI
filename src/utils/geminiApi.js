export const extractInvoiceDataWithGemini = async (fileContent, apiKey, model = 'gemini-1.5-flash-002', isImage = false, mimeType = '') => {
  if (!apiKey) throw new Error('Gemini API key is required')

  // Use newer model names for the v1 stable endpoint (1.5 is deprecated on new keys)
  const actualModel = model || 'gemini-1.5-flash'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${apiKey}`

  const prompt = `Extract all invoice data from the following content and return JSON exactly matching this structure without any markdown blocks or backticks:
{
  "vendor": "Vendor Name",
  "invoiceNumber": "INV-123",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "billTo": "Customer Name",
  "lineItems": [{"desc": "Item 1", "qty": 1, "unitPrice": 100, "total": 100}],
  "subtotal": 100,
  "taxRate": 10,
  "taxAmount": 10,
  "discount": 0,
  "total": 110,
  "currency": "USD",
  "paymentTerms": "Net 30",
  "notes": "Thank you",
  "confidence": {
    "vendor": 95,
    "invoiceNumber": 95,
    "date": 90,
    "dueDate": 80,
    "total": 99,
    "overall": 92
  }
}`

  let contents
  if (isImage) {
    contents = [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType, data: fileContent } }
      ]
    }]
  } else {
    contents = [{
      parts: [
        { text: prompt + '\n\nContent:\n' + fileContent }
      ]
    }]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      contents,
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json()
    let errorMsg = errorData.error?.message || 'Failed to extract data from Gemini'
    
    // If it's a 404 not found, let's fetch the actual available models for this specific API key
    if (response.status === 404) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
        const listData = await listRes.json()
        const availableModels = listData.models?.map(m => m.name).join(', ') || 'None found'
        errorMsg += `\n\nAVAILABLE MODELS FOR YOUR KEY: ${availableModels}`
      } catch (e) {
        console.error('Failed to fetch list models', e)
      }
    }
    
    throw new Error(errorMsg)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  
  let cleanJson = ''
  // Use regex to extract the JSON block in case there is conversational text
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleanJson = jsonMatch[0]
  } else {
    cleanJson = rawText.trim()
  }

  try {
    if (!cleanJson) {
      throw new Error(`Empty response from Gemini. Finish reason: ${data.candidates?.[0]?.finishReason || 'Unknown'}`)
    }
    return JSON.parse(cleanJson)
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON', cleanJson, data)
    throw new Error(`Failed to parse AI response as valid JSON. Response: ${cleanJson.substring(0, 80)}...`)
  }
}
