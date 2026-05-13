import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminRequest } from '@/lib/admin-auth'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: providerId } = await params

  const locations = await prisma.providerLocation.findMany({
    where: { providerId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ locations })
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: providerId } = await params
  const body = await request.json()

  const {
    locationName,
    address,
    city,
    state,
    zip,
    latitude,
    longitude,
    serviceRadius,
    phone,
    email,
    contactName,
    isPrimary,
    active,
    notes,
  } = body

  if (!city || !state) {
    return NextResponse.json({ error: 'city and state are required' }, { status: 400 })
  }

  // Verify provider exists
  const provider = await prisma.serviceProvider.findUnique({ where: { id: providerId } })
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  const location = await prisma.providerLocation.create({
    data: {
      providerId,
      locationName: locationName || null,
      address: address || null,
      city,
      state,
      zip: zip || null,
      latitude: latitude != null ? Number(latitude) : null,
      longitude: longitude != null ? Number(longitude) : null,
      serviceRadius: serviceRadius ? Number(serviceRadius) : 50,
      phone: phone || null,
      email: email || null,
      contactName: contactName || null,
      isPrimary: Boolean(isPrimary),
      active: active !== undefined ? Boolean(active) : true,
      notes: notes || null,
    },
  })

  return NextResponse.json({ location }, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: providerId } = await params
  const body = await request.json()
  const { locationId, ...updates } = body

  if (!locationId) {
    return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
  }

  // Ensure the location belongs to this provider
  const existing = await prisma.providerLocation.findFirst({
    where: { id: locationId, providerId },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const location = await prisma.providerLocation.update({
    where: { id: locationId },
    data: {
      ...(updates.locationName !== undefined && { locationName: updates.locationName || null }),
      ...(updates.address !== undefined && { address: updates.address || null }),
      ...(updates.city !== undefined && { city: updates.city }),
      ...(updates.state !== undefined && { state: updates.state }),
      ...(updates.zip !== undefined && { zip: updates.zip || null }),
      ...(updates.latitude !== undefined && {
        latitude: updates.latitude != null ? Number(updates.latitude) : null,
      }),
      ...(updates.longitude !== undefined && {
        longitude: updates.longitude != null ? Number(updates.longitude) : null,
      }),
      ...(updates.serviceRadius !== undefined && {
        serviceRadius: Number(updates.serviceRadius),
      }),
      ...(updates.phone !== undefined && { phone: updates.phone || null }),
      ...(updates.email !== undefined && { email: updates.email || null }),
      ...(updates.contactName !== undefined && { contactName: updates.contactName || null }),
      ...(updates.isPrimary !== undefined && { isPrimary: Boolean(updates.isPrimary) }),
      ...(updates.active !== undefined && { active: Boolean(updates.active) }),
      ...(updates.notes !== undefined && { notes: updates.notes || null }),
    },
  })

  return NextResponse.json({ location })
}
