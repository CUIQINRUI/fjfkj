import { useEffect } from "react"
import { DEMO_MODE } from "../lib/supabase"
import { PRODUCT } from "../product"

const placeholders = {
  name: "[제품 이름]",
  concept: "[제품 컨셉, 한 줄]",
  description: "[제품 설명, 2~3문장]",
}

export function ProductHeader() {
  const hasName = PRODUCT.name.trim().length > 0
  const hasConcept = PRODUCT.concept.trim().length > 0
  const hasDescription = PRODUCT.description.trim().length > 0

  useEffect(() => {
    document.title = hasName ? PRODUCT.name : placeholders.name
  }, [hasName])

  return (
    <header className="product-header">
      <h1 className={`t-display${hasName ? "" : " placeholder"}`}>
        {hasName ? PRODUCT.name : placeholders.name}
      </h1>
      <p
        className={`product-concept t-label${hasConcept ? "" : " placeholder"}`}
      >
        {hasConcept ? PRODUCT.concept : placeholders.concept}
      </p>
      <p
        className={`product-description t-body${
          hasDescription ? "" : " placeholder"
        }`}
      >
        {hasDescription ? PRODUCT.description : placeholders.description}
      </p>
      {DEMO_MODE && (
        <p className="demo-label t-caption">데모 데이터로 표시 중</p>
      )}
    </header>
  )
}
