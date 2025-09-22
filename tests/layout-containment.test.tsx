import { afterEach, beforeEach, describe, expect, it } from "vitest"

const scrollDescriptor = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView"
)

function mountContainmentSection(testId: string, items: string[]) {
  const container = document.createElement("section")
  container.dataset.testid = testId
  container.className = "content-visibility-auto contain-content"

  for (const item of items) {
    const card = document.createElement("article")
    card.textContent = item
    container.appendChild(card)
  }

  document.body.appendChild(container)
  return container
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    writable: true,
    value: function scrollIntoViewStub(this: Element) {
      this.setAttribute("data-scrolled", "true")
    },
  })
})

afterEach(() => {
  document.body.innerHTML = ""

  if (scrollDescriptor) {
    Object.defineProperty(Element.prototype, "scrollIntoView", scrollDescriptor)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (Element.prototype as any).scrollIntoView
  }
})

describe("layout containment wrappers", () => {
  it("keep messaging feed items discoverable after a scroll", () => {
    const container = mountContainmentSection("messaging-feed", [
      "Threaded conversations",
      "Realtime presence",
    ])

    expect(container.textContent).toContain("Realtime presence")

    container.scrollIntoView()

    expect(container.getAttribute("data-scrolled")).toBe("true")
    expect(container.textContent).toContain("Realtime presence")
  })

  it("keep booking grids accessible once scrolled into view", () => {
    const container = mountContainmentSection("booking-grid", [
      "Kitchen",
      "PlayStation Nook",
      "Shared Computer",
    ])

    expect(container.textContent).toContain("PlayStation Nook")

    container.scrollIntoView()

    expect(container.getAttribute("data-scrolled")).toBe("true")
    expect(container.textContent).toContain("Shared Computer")
  })
})
