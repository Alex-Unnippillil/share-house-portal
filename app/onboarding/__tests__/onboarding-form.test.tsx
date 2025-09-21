import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, beforeEach, vi } from "vitest"

import { OnboardingForm } from "../onboarding-form"

vi.mock("../actions", () => ({
  saveOnboardingStep: vi.fn().mockResolvedValue({ success: true }),
  completeOnboarding: vi.fn().mockResolvedValue({ success: true }),
}))

import { saveOnboardingStep, completeOnboarding } from "../actions"

const mockedSaveStep = saveOnboardingStep as unknown as vi.Mock
const mockedComplete = completeOnboarding as unknown as vi.Mock

describe("OnboardingForm", () => {
  beforeEach(() => {
    mockedSaveStep.mockClear()
    mockedComplete.mockClear()
  })

  it("walks through onboarding steps and submits data", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })

    render(
      <OnboardingForm
        buildings={[{ id: "b1", name: "Building One" }]}
        units={[{ id: "u1", unit_number: "3A", building_id: "b1", bedrooms: 3, bathrooms: 2 }]}
        initialValues={{
          buildingId: null,
          unitId: null,
          roommateRole: "tenant",
          rentShare: 800,
          emergencyContacts: [{ name: "", relationship: "", phone: "", email: "" }],
          vehicles: [],
          acknowledgements: { houseRules: false, rentPayments: false, emergencyAccess: false },
        }}
      />
    )

    // Step 1: building selection
    await user.click(screen.getByRole("combobox", { name: /building/i }))
    await user.click(screen.getByRole("option", { name: /building one/i }))
    await user.click(screen.getByRole("combobox", { name: /unit/i }))
    await user.click(screen.getByRole("option", { name: /unit 3a/i }))
    await user.click(screen.getByRole("button", { name: /next step/i }))

    expect(mockedSaveStep).toHaveBeenCalledWith("building", { buildingId: "b1", unitId: "u1" })

    // Step 2: roommate details (defaults are valid)
    await user.click(screen.getByRole("button", { name: /next step/i }))
    expect(mockedSaveStep).toHaveBeenCalledWith("role", expect.objectContaining({ roommateRole: "tenant" }))

    // Step 3: emergency contacts – fill required fields
    const nameInput = screen.getByPlaceholderText(/contact name/i)
    await user.type(nameInput, "Alex")
    await user.type(screen.getByPlaceholderText(/e\.g\. parent/i), "Sibling")
    await user.type(screen.getByPlaceholderText(/e\.g\. \+1/i), "+1 555 444 3333")
    await user.click(screen.getByRole("button", { name: /next step/i }))

    expect(mockedSaveStep).toHaveBeenCalledWith(
      "emergency",
      expect.objectContaining({
        emergencyContacts: [
          expect.objectContaining({ name: "Alex", relationship: "Sibling" }),
        ],
      })
    )

    // Step 4: vehicles - skip without adding
    await user.click(screen.getByRole("button", { name: /next step/i }))
    expect(mockedSaveStep).toHaveBeenCalledWith("vehicles", { vehicles: [] })

    // Step 5: policies
    const policyCheckboxes = screen.getAllByRole("checkbox")
    for (const checkbox of policyCheckboxes) {
      if (!checkbox.hasAttribute("data-state") || checkbox.getAttribute("data-state") !== "checked") {
        await user.click(checkbox)
      }
    }
    await user.click(screen.getByRole("button", { name: /next step/i }))

    expect(mockedSaveStep).toHaveBeenCalledWith(
      "policy",
      expect.objectContaining({ houseRules: true, rentPayments: true, emergencyAccess: true })
    )

    // Review step – finish onboarding
    await user.click(screen.getByRole("button", { name: /finish onboarding/i }))

    expect(mockedComplete).toHaveBeenCalled()
  })
})
