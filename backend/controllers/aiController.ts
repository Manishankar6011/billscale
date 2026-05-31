import { Request, Response } from 'express';
import { GoogleGenerativeAI, SchemaType, Tool } from '@google/generative-ai';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import Sale from '../models/Sale';
import Purchase from '../models/Purchase';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Staff from '../models/Staff';

// Initialize SDKs
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Define tools for Gemini
const geminiTools: Tool[] = [{
  functionDeclarations: [
    {
      name: 'get_sales_summary',
      description: 'Get total sales amount, today sales amount, specific date sales amount, count, and recent sales for the tenant.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.STRING,
            description: 'Number of items to fetch (default: "5")',
          },
          date: {
            type: SchemaType.STRING,
            description: 'Optional date filter. Can be "today", "yesterday", "last_week", "last_month", or YYYY-MM-DD.',
          },
        },
      },
    },
    {
      name: 'get_purchases_summary',
      description: 'Get total purchase amount, count, and recent purchases.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.STRING,
            description: 'Number of items to fetch (default: "5")',
          },
        },
      },
    },
    {
      name: 'get_stock_status',
      description: 'Get current stock details for all products.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.STRING,
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: SchemaType.STRING,
            description: 'Optional product name to search for specific product details',
          },
        },
      },
    },
    {
      name: 'get_customer_summary',
      description: 'Get total number of customers, list of customers, and details about pending payments/dues (udhar) for customers.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.STRING,
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: SchemaType.STRING,
            description: 'Optional customer name to search for',
          },
        },
      },
    },
    {
      name: 'get_staff_summary',
      description: 'Get list of staff members and their roles.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          limit: {
            type: SchemaType.STRING,
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: SchemaType.STRING,
            description: 'Optional staff name to search for',
          },
        },
      },
    }
  ]
}];

// Define tools for Groq
const groqTools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_sales_summary',
      description: 'Get total sales amount, today sales amount, specific date sales amount, count, and recent sales for the tenant.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Number of items to fetch (default: "5")',
          },
          date: {
            type: 'string',
            description: 'Optional date filter. Can be "today", "yesterday", "last_week", "last_month", or YYYY-MM-DD.',
          },
        },
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_purchases_summary',
      description: 'Get total purchase amount, count, and recent purchases.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Number of items to fetch (default: "5")',
          },
        },
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_status',
      description: 'Get current stock details for all products.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: 'string',
            description: 'Optional product name to search for specific product details',
          },
        },
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_summary',
      description: 'Get total number of customers, list of customers, and details about pending payments/dues (udhar) for customers.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: 'string',
            description: 'Optional customer name to search for',
          },
        },
      },
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_staff_summary',
      description: 'Get list of staff members and their roles.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'string',
            description: 'Number of items to fetch (default: "5")',
          },
          search_query: {
            type: 'string',
            description: 'Optional staff name to search for',
          },
        },
      },
    }
  }
];

// Tool executor
async function executeTool(name: string, args: any, tenantId: string) {
  try {
    switch (name) {
      case 'get_sales_summary': {
        const limit = args.limit ? parseInt(args.limit, 10) : 5;
        const baseMatch = { tenantId: new mongoose.Types.ObjectId(tenantId) };
        let findQuery: any = { tenantId };

        let specificDateAmount = 0;
        let specificDateSalesDocs: any[] = [];
        if (args.date) {
          let startOfTarget: Date | null = null;
          let endOfTarget: Date | null = null;
          const dateStr = args.date.toLowerCase();
          
          if (dateStr === 'today') {
            startOfTarget = new Date();
            endOfTarget = new Date();
          } else if (dateStr === 'yesterday') {
            startOfTarget = new Date();
            startOfTarget.setDate(startOfTarget.getDate() - 1);
            endOfTarget = new Date(startOfTarget);
          } else if (dateStr === 'last_week' || dateStr === 'last week' || dateStr === 'last 7 days') {
            startOfTarget = new Date();
            startOfTarget.setDate(startOfTarget.getDate() - 7);
            endOfTarget = new Date();
          } else if (dateStr === 'last_month' || dateStr === 'last month' || dateStr === 'last 30 days') {
            startOfTarget = new Date();
            startOfTarget.setDate(startOfTarget.getDate() - 30);
            endOfTarget = new Date();
          } else {
            const targetDate = new Date(args.date);
            if (!isNaN(targetDate.getTime())) {
               startOfTarget = new Date(targetDate);
               endOfTarget = new Date(targetDate);
            }
          }

          if (startOfTarget && endOfTarget) {
            startOfTarget.setHours(0, 0, 0, 0);
            endOfTarget.setHours(23, 59, 59, 999);
            
            findQuery.date = { $gte: startOfTarget, $lte: endOfTarget };
            
            const specificDateAggregation = await Sale.aggregate([
              { $match: { ...baseMatch, date: { $gte: startOfTarget, $lte: endOfTarget } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);
            specificDateAmount = specificDateAggregation[0]?.total || 0;

            specificDateSalesDocs = await Sale.find({
              ...baseMatch,
              date: { $gte: startOfTarget, $lte: endOfTarget }
            }).sort({ createdAt: -1 }).limit(20).populate('customerId', 'name').populate('items.productId', 'name');
          }
        }

        const sales = await Sale.find(findQuery).sort({ createdAt: -1 }).limit(limit).populate('customerId', 'name').populate('items.productId', 'name');
        const totalSalesCount = await Sale.countDocuments(findQuery);
        
        const salesAggregation = await Sale.aggregate([
          { $match: baseMatch },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalAmount = salesAggregation[0]?.total || 0;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const todaySalesAggregation = await Sale.aggregate([
          { 
            $match: { 
              ...baseMatch,
              date: { $gte: startOfDay, $lte: endOfDay }
            } 
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const todayAmount = todaySalesAggregation[0]?.total || 0;

        const todaySalesDocs = await Sale.find({
          ...baseMatch,
          date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 }).limit(20).populate('customerId', 'name').populate('items.productId', 'name');

        return {
          total_sales_count: totalSalesCount,
          total_revenue: totalAmount,
          today_revenue: todayAmount,
          specific_date_revenue: args.date ? specificDateAmount : undefined,
          specific_date_requested: args.date,
          specific_date_sales_list: args.date ? specificDateSalesDocs.map(s => ({
            date: s.date,
            customer: s.customerName || 'Unknown',
            amount: s.totalAmount,
            status: s.status,
            items: s.items?.map((item: any) => ({ product: item.productId?.name || 'Unknown', quantity: item.quantity })) || []
          })) : undefined,
          today_sales_list: todaySalesDocs.map(s => ({
            date: s.date,
            customer: s.customerName || 'Unknown',
            amount: s.totalAmount,
            status: s.status,
            items: s.items?.map((item: any) => ({ product: item.productId?.name || 'Unknown', quantity: item.quantity })) || []
          })),
          recent_sales: sales.map(s => ({
            date: s.date,
            customer: s.customerName || 'Unknown',
            amount: s.totalAmount,
            status: s.status,
            items: s.items?.map((item: any) => ({ product: item.productId?.name || 'Unknown', quantity: item.quantity })) || []
          })),
        };
      }
      case 'get_purchases_summary': {
        const limit = args.limit ? parseInt(args.limit, 10) : 5;
        const purchases = await Purchase.find({ tenantId }).sort({ createdAt: -1 }).limit(limit);
        const totalPurchasesCount = await Purchase.countDocuments({ tenantId });
        const purchasesAggregation = await Purchase.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } }
        ]);
        const totalAmount = purchasesAggregation[0]?.total || 0;
        return {
          total_purchases_count: totalPurchasesCount,
          total_expense: totalAmount,
          recent_purchases: purchases.map(p => ({
            date: p.date,
            supplier: p.supplierName,
            amount: p.totalAmount,
            status: p.paymentStatus,
          })),
        };
      }
      case 'get_stock_status': {
        const limit = args.limit ? parseInt(args.limit, 10) : 5;
        let query: any = { tenantId };
        if (args.search_query) {
          query.name = { $regex: args.search_query, $options: 'i' };
        }
        const totalCount = await Product.countDocuments(query);
        const products = await Product.find(query).select('name unit stock minStockAlert category').limit(limit);
        return {
          total_products: totalCount,
          products: products.map(p => ({
            name: p.name,
            category: p.category,
            stock: p.stock,
            unit: p.unit,
            needs_restock: p.stock <= p.minStockAlert,
          })),
        };
      }
      case 'get_customer_summary': {
        const limit = args.limit ? parseInt(args.limit, 10) : 5;
        let query: any = { tenantId };
        if (args.search_query) {
          query.name = { $regex: args.search_query, $options: 'i' };
        }
        const totalCount = await Customer.countDocuments(query);
        const customers = await Customer.find(query).limit(limit);

        // Fetch pending dues grouped by customer name using aggregation on Sale collection
        const pendingSales = await Sale.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), balanceDue: { $gt: 0 } } },
          { $group: { _id: "$customerName", totalPending: { $sum: "$balanceDue" } } },
          { $sort: { totalPending: -1 } },
          { $limit: limit }
        ]);

        const totalPendingSalesResult = await Sale.aggregate([
          { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), balanceDue: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: "$balanceDue" } } }
        ]);

        return {
          total_customers: totalCount,
          total_udhar_in_market: totalPendingSalesResult[0]?.total || 0,
          customers_with_pending_dues: pendingSales.map(p => ({ customerName: p._id, udharAmount: p.totalPending })),
          results: customers.map(c => ({ name: c.name, phone: c.phone, address: c.address })),
        };
      }
      case 'get_staff_summary': {
        const limit = args.limit ? parseInt(args.limit, 10) : 5;
        let query: any = { tenantId };
        if (args.search_query) {
          query.name = { $regex: args.search_query, $options: 'i' };
        }
        const totalCount = await Staff.countDocuments(query);
        const staffList = await Staff.find(query).select('name role status salaryAmount').limit(limit);
        return {
          total_staff: totalCount,
          staff: staffList.map(s => ({
            name: s.name,
            role: s.role,
            status: s.status,
            salary: s.salaryAmount,
          })),
        };
      }
      default:
        return { error: `Tool ${name} not implemented.` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return { error: error.message };
  }
}

export const handleAIChat = async (req: Request, res: Response) => {
  try {
    const { prompt, history = [] } = req.body;
    const tenantId = (req as any).user?.tenantId;

    // Limit history to last 10 messages to save tokens and prevent context limit errors
    const MAX_HISTORY = 10;
    const historyToUse = history && history.length > 0 ? history.slice(-MAX_HISTORY) : [];

    // The frontend may pass either 'prompt' (string) OR 'messages' (array) depending on implementation
    const messages = req.body.messages || historyToUse.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content || msg.text || ''
    }));

    // If using the single prompt style, append it to messages
    if (prompt && (!messages.length || messages[messages.length-1].content !== prompt)) {
      messages.push({ role: 'user', content: prompt });
    }

    if (!tenantId) {
      return res.status(401).json({ message: 'Not authorized, no tenant ID' });
    }

    const provider = process.env.AI_PROVIDER || 'gemini';
    const systemPrompt = 'You are an AI assistant for BuildMate ERP. You help users understand their business data. Use the provided tools to fetch real-time data from the database. CRITICAL INSTRUCTION: You MUST always reply in the language the user asked the question in. If the user asks in Hindi or Hinglish, your entire response MUST be in Hindi or Hinglish (e.g. "Aapke paas 0 stock hai"). Do NOT reply in English if the user asked in Hindi. CRITICAL: When users ask for a list, only mention the total count and list 4-5 items. Then explicitly tell the user to view the complete list in the appropriate tab: "Inventory tab" for products/items, "Customers tab" for customers, and "Staff tab" for staff/employees. If the user asks about today\'s sales, or which customers bought items today, use the `get_sales_summary` tool and look at the `today_sales_list` or `recent_sales`. Do NOT use `get_customer_summary` for today\'s purchases. For yesterday, last week, or specific date sales, use `get_sales_summary` passing date (e.g. "last_week"), and read `specific_date_revenue` and `specific_date_sales_list` (which also includes products sold).';

    if (provider === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({ message: 'GROQ_API_KEY is not configured.' });
      }

      const currentMessages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      ];

      let steps = 0;
      const MAX_STEPS = 5;
      let currentTools: Groq.Chat.ChatCompletionTool[] | undefined = groqTools;
      let finalContent = '';

      while (steps < MAX_STEPS) {
        steps++;
        
        const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
        const payload: any = {
          model: groqModel,
          messages: currentMessages,
          max_tokens: 1000,
        };

        if (currentTools && currentTools.length > 0) {
          payload.tools = currentTools;
          payload.tool_choice = 'auto';
        }

        const response = await groq.chat.completions.create(payload);
        const message = response.choices[0].message;

        if (message.tool_calls && message.tool_calls.length > 0) {
          message.content = null; // Important for Groq
        }

        currentMessages.push(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
          finalContent = message.content || '';
          break;
        }

        const toolResults: Groq.Chat.ChatCompletionMessageParam[] = [];
        for (const toolCall of message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments || '{}');
          console.log(`[Groq Tool Called] ${toolCall.function.name}`, args);
          const result = await executeTool(toolCall.function.name, args, tenantId);
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        }
        currentMessages.push(...toolResults);
      }

      return res.json({ response: finalContent, content: finalContent });

    } else {
      // GEMINI PROVIDER
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ message: 'GEMINI_API_KEY is not configured.' });
      }

      const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({
        model: geminiModel,
        tools: geminiTools,
        systemInstruction: systemPrompt,
      });

      // Map to Gemini history format (exclude the very last user message to pass it in sendMessage)
      const lastMessage = messages.pop();
      
      const chat = model.startChat({
        history: messages.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      });

      let result = await chat.sendMessage([{ text: lastMessage?.content || '' }]);
      let functionCalls = result.response.functionCalls();

      let callDepth = 0;
      while (functionCalls && functionCalls.length > 0 && callDepth < 5) {
        const toolCall = functionCalls[0];
        console.log(`[Gemini Tool Called] ${toolCall.name}`, toolCall.args);
        
        const toolResult = await executeTool(toolCall.name, toolCall.args, tenantId);
        
        result = await chat.sendMessage([{
          functionResponse: {
            name: toolCall.name,
            response: toolResult as object,
          }
        }]);
        
        functionCalls = result.response.functionCalls();
        callDepth++;
      }

      const finalContent = result.response.text();
      return res.json({ response: finalContent, content: finalContent });
    }

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'Internal Server Error while processing AI request.' });
  }
};
