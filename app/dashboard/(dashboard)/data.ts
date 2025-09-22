import "server-only"

import { cache } from "react"

type RentSummary = {
        amount: number
        dueDate: string
        autopayEnabled: boolean
}

type DocumentSummary = {
        name: string
        href: string
}

type RoommateUpdate = {
        id: string
        author: string
        message: string
        timestamp: string
}

async function wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWelcomeMessage() {
        await wait(120)
        return {
                title: "Welcome back",
                ctaHref: "/payments",
                ctaLabel: "Pay rent",
        }
}

export const getWelcomeMessage = cache(fetchWelcomeMessage)

export function loadWelcomeMessageUncached() {
        return fetchWelcomeMessage()
}

async function fetchRentSummary(): Promise<RentSummary> {
        await wait(240)
        return {
                amount: 1260,
                dueDate: "2024-08-01",
                autopayEnabled: true,
        }
}

export const getRentSummary = cache(fetchRentSummary)

export function loadRentSummaryUncached() {
        return fetchRentSummary()
}

async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
        await wait(180)
        return [
                {
                        name: "Lease agreement v2.pdf",
                        href: "/documents",
                },
                {
                        name: "House rules.pdf",
                        href: "/documents",
                },
        ]
}

export const getRecentDocuments = cache(fetchRecentDocuments)

export function loadRecentDocumentsUncached() {
        return fetchRecentDocuments()
}

async function fetchRoommateUpdates(): Promise<RoommateUpdate[]> {
        await wait(320)
        return [
                {
                        id: "1",
                        author: "Jordan",
                        message: "Wi-Fi is down, rebooted router.",
                        timestamp: new Date().toISOString(),
                },
                {
                        id: "2",
                        author: "Avery",
                        message: "Parking spot swap this weekend?",
                        timestamp: new Date().toISOString(),
                },
        ]
}

export const getRoommateUpdates = cache(fetchRoommateUpdates)

export function loadRoommateUpdatesUncached() {
        return fetchRoommateUpdates()
}

export type { DocumentSummary, RentSummary, RoommateUpdate }
