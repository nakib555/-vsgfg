"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, ChevronDown, ChevronRight, FileText, Replace, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CodeFile } from "@/types/file"

interface SearchResult {
  file: CodeFile
  matches: {
    line: number
    column: number
    text: string
    matchText: string
    lineContent: string
  }[]
}

interface SearchPanelProps {
  files: CodeFile[]
  onFileSelect: (file: CodeFile) => void
}

export default function SearchPanel({ files, onFileSelect }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [replaceQuery, setReplaceQuery] = useState("")
  const [showReplace, setShowReplace] = useState(false)
  const [matchCase, setMatchCase] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const [matchWholeWord, setMatchWholeWord] = useState(false)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const results: SearchResult[] = []

    files.forEach(file => {
      const matches: SearchResult['matches'] = []
      const lines = file.content.split('\n')

      lines.forEach((line, lineIndex) => {
        let searchPattern: RegExp

        try {
          if (useRegex) {
            const flags = matchCase ? 'g' : 'gi'
            searchPattern = new RegExp(searchQuery, flags)
          } else {
            const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const pattern = matchWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery
            const flags = matchCase ? 'g' : 'gi'
            searchPattern = new RegExp(pattern, flags)
          }

          let match
          while ((match = searchPattern.exec(line)) !== null) {
            matches.push({
              line: lineIndex + 1,
              column: match.index + 1,
              text: match[0],
              matchText: match[0],
              lineContent: line
            })

            // Prevent infinite loop for zero-width matches
            if (match.index === searchPattern.lastIndex) {
              searchPattern.lastIndex++
            }
          }
        } catch (error) {
          // Invalid regex, skip this file
          console.warn('Invalid regex pattern:', searchQuery)
        }
      })

      if (matches.length > 0) {
        results.push({ file, matches })
      }
    })

    return results
  }, [searchQuery, files, matchCase, useRegex, matchWholeWord])

  const totalMatches = searchResults.reduce((sum, result) => sum + result.matches.length, 0)

  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId)
    } else {
      newExpanded.add(fileId)
    }
    setExpandedFiles(newExpanded)
  }

  const highlightMatch = (text: string, matchText: string, column: number) => {
    if (!matchText) return text

    const beforeMatch = text.substring(0, column - 1)
    const afterMatch = text.substring(column - 1 + matchText.length)

    return (
      <>
        {beforeMatch}
        <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {matchText}
        </span>
        {afterMatch}
      </>
    )
  }

  const handleReplaceAll = () => {
    // This would implement replace functionality
    console.log('Replace all:', searchQuery, 'with:', replaceQuery)
    // In a real implementation, this would modify the files
  }

  const clearSearch = () => {
    setSearchQuery("")
    setReplaceQuery("")
    setExpandedFiles(new Set())
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="p-3 border-b border-border">
        <div className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-20"
            />
            <div className="absolute right-1 top-1 flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setMatchCase(!matchCase)}
                title="Match Case"
              >
                <span className={cn("text-xs font-mono", matchCase && "bg-primary text-primary-foreground rounded px-1")}>
                  Aa
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setMatchWholeWord(!matchWholeWord)}
                title="Match Whole Word"
              >
                <span className={cn("text-xs font-mono", matchWholeWord && "bg-primary text-primary-foreground rounded px-1")}>
                  Ab
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setUseRegex(!useRegex)}
                title="Use Regular Expression"
              >
                <span className={cn("text-xs font-mono", useRegex && "bg-primary text-primary-foreground rounded px-1")}>
                  .*
                </span>
              </Button>
            </div>
          </div>

          {/* Replace Input */}
          {showReplace && (
            <div className="relative">
              <Replace className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Replace"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplace(!showReplace)}
              >
                <Replace className="h-4 w-4 mr-1" />
                Replace
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                disabled={!searchQuery}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            {showReplace && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReplaceAll}
                disabled={!searchQuery || !replaceQuery}
              >
                Replace All
              </Button>
            )}
          </div>

          {/* Results Summary */}
          {searchQuery && (
            <div className="text-sm text-muted-foreground">
              {totalMatches > 0 ? (
                <>
                  {totalMatches} result{totalMatches !== 1 ? 's' : ''} in {searchResults.length} file{searchResults.length !== 1 ? 's' : ''}
                </>
              ) : (
                'No results found'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {searchResults.map((result) => {
            const isExpanded = expandedFiles.has(result.file.id)
            
            return (
              <Collapsible
                key={result.file.id}
                open={isExpanded}
                onOpenChange={() => toggleFileExpansion(result.file.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start p-2 h-auto"
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{result.file.name}</span>
                      <Badge variant="secondary" className="ml-auto">
                        {result.matches.length}
                      </Badge>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="ml-6">
                  <div className="space-y-1">
                    {result.matches.map((match, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto text-left"
                        onClick={() => onFileSelect(result.file)}
                      >
                        <div className="flex flex-col items-start space-y-1 w-full">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>Line {match.line}:{match.column}</span>
                          </div>
                          <div className="text-sm font-mono truncate w-full">
                            {highlightMatch(match.lineContent, match.matchText, match.column)}
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}