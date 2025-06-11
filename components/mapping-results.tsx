import type React from "react"

interface MappingResultsProps {
  results: {
    label: string
    value: string
  }[]
}

const MappingResults: React.FC<MappingResultsProps> = ({ results }) => {
  return (
    <div>
      {results.map((result, index) => (
        <div key={index}>
          <p>
            {result.label}: {result.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export default MappingResults
