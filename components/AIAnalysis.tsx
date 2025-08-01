'use client';

import { useState } from 'react';
import { useStore } from '../store';

interface AIAnalysisProps {
  className?: string;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  spendingAnalysis?: {
    totalSpending: number;
    categories: { category: string; amount: number; percentage: number }[];
    unnecessaryCosts: string[];
  };
}

const AIAnalysis = ({ className = '' }: AIAnalysisProps) => {
  const { sheets } = useStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const COHERE_API_KEY = "7FaSp7LMoPrxPQfldrNtcmwatrarKThEztUXHMha";
  const COHERE_API_URL = "https://api.cohere.ai/v1/generate";

  const prepareDataForAnalysis = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allData: any[] = [];
    
    Object.entries(sheets).forEach(([sheetName, sheetData]) => {
      if (sheetData && sheetData.length > 0) {
        // Add sheet name as header
        allData.push([`=== ${sheetName} ===`]);
        
        // Add data rows
        sheetData.forEach((row, rowIndex) => {
          if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            allData.push([`Row ${rowIndex + 1}:`, ...row]);
          }
        });
        
        allData.push([]); // Empty row between sheets
      }
    });
    
    return allData;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const analyzeWithCohere = async (data: any[][]) => {
    const dataString = JSON.stringify(data, null, 2);
    
    const prompt = `
Analyze this Excel spreadsheet data and provide comprehensive insights:

${dataString}

Please provide:
1. A concise summary of the data (2-3 sentences)
2. Key insights about the data patterns, trends, or notable findings
3. Specific recommendations based on the analysis
4. If this appears to be financial data, identify:
   - Total spending
   - Spending categories with amounts and percentages
   - Potential unnecessary costs or areas for cost reduction
   - Suggestions for optimization

Format the response as JSON with this structure:
{
  "summary": "brief summary",
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "spendingAnalysis": {
    "totalSpending": number,
    "categories": [{"category": "name", "amount": number, "percentage": number}],
    "unnecessaryCosts": ["cost1", "cost2"]
  }
}
`;

    try {
      const response = await fetch(COHERE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'command-r-plus',
          prompt,
          max_tokens: 1000,
          temperature: 0.7,
          k: 0,
          stop_sequences: [],
          return_likelihoods: 'NONE'
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.generations && result.generations[0] && result.generations[0].text) {
        const textResponse = result.generations[0].text;
        
        // Try to parse JSON from the response
        try {
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedAnalysis = JSON.parse(jsonMatch[0]);
            setAnalysis(parsedAnalysis);
          } else {
            // Fallback: create a simple analysis
            setAnalysis({
              summary: textResponse.substring(0, 200) + "...",
              insights: ["Analysis completed successfully using Cohere AI"],
              recommendations: ["Review the data for patterns"]
            });
          }
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          setAnalysis({
            summary: textResponse.substring(0, 200) + "...",
            insights: ["Analysis completed successfully using Cohere AI"],
            recommendations: ["Review the data for patterns"]
          });
        }
      } else {
        throw new Error('Invalid response format from Cohere API');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      setError('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    const data = prepareDataForAnalysis();
    if (data.length === 0) {
      setError('No data available for analysis. Please import or add some data first.');
      setIsAnalyzing(false);
      return;
    }

    await analyzeWithCohere(data);
  };

  const hasData = Object.values(sheets).some(sheetData => 
    sheetData && sheetData.some(row => 
      row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    )
  );

  const renderSpendingChart = (categories: { category: string; amount: number; percentage: number }[]) => {
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-800 mb-3">Spending Breakdown</h4>
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-24 text-xs text-gray-600 truncate">{cat.category}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${cat.percentage}%` }}
                ></div>
              </div>
              <div className="w-16 text-xs text-gray-600 text-right">
                {cat.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis (Cohere)</h3>
      
      <div className="space-y-4">
        <button
          onClick={handleAnalyze}
          disabled={!hasData || isAnalyzing}
          className={`w-full px-4 py-2 rounded-md font-medium transition ${
            hasData && !isAnalyzing
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? '🤖 Analyzing with Cohere...' : '🔍 Analyze with Cohere AI'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Summary</h4>
              <p className="text-sm text-blue-700">{analysis.summary}</p>
            </div>

            {/* Insights */}
            {analysis.insights && analysis.insights.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="text-sm font-medium text-green-800 mb-2">Key Insights</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  {analysis.insights.map((insight, index) => (
                    <li key={index}>• {insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Recommendations</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {analysis.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Spending Analysis */}
            {analysis.spendingAnalysis && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                <h4 className="text-sm font-medium text-purple-800 mb-2">Financial Analysis</h4>
                
                <div className="mb-3">
                  <p className="text-sm text-purple-700">
                    <strong>Total Spending:</strong> ${analysis.spendingAnalysis.totalSpending}
                  </p>
                </div>

                {analysis.spendingAnalysis.categories && analysis.spendingAnalysis.categories.length > 0 && (
                  renderSpendingChart(analysis.spendingAnalysis.categories)
                )}

                {analysis.spendingAnalysis.unnecessaryCosts && analysis.spendingAnalysis.unnecessaryCosts.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-red-700 mb-1">Potential Unnecessary Costs:</h5>
                    <ul className="text-xs text-red-600 space-y-1">
                      {analysis.spendingAnalysis.unnecessaryCosts.map((cost, index) => (
                        <li key={index}>• {cost}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!hasData && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              💡 <strong>Tip:</strong> Import an Excel file or add data to your spreadsheet before analyzing
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Cohere AI Analysis Features:</h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• Analyzes all sheets and data patterns using Cohere AI</li>
          <li>• Identifies spending trends and categories</li>
          <li>• Highlights potential cost savings</li>
          <li>• Provides actionable recommendations</li>
          <li>• Visual spending breakdown charts</li>
        </ul>
      </div>
    </div>
  );
};

export default AIAnalysis;
  