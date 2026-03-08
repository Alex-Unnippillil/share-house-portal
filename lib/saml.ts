import { XMLParser } from "fast-xml-parser";

export interface SamlMetadataDetails {
  entityId: string;
  singleSignOnService: string;
  singleLogoutService?: string;
  certificate?: string;
}

export interface SamlAssertion {
  issuer: string | null;
  nameId: string | null;
  attributes: Record<string, string>;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normaliseAttributeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    const maybeText = (value as Record<string, unknown>)["#text"];
    if (maybeText !== undefined && maybeText !== null) {
      return String(maybeText);
    }
  }

  return String(value);
}

export function parseSamlMetadata(xml: string): SamlMetadataDetails {
  const document = parser.parse(xml);

  let entityDescriptor = document.EntityDescriptor as
    | Record<string, any>
    | Array<Record<string, any>>
    | undefined;

  if (!entityDescriptor && document.EntitiesDescriptor) {
    const descriptors = asArray<Record<string, any>>(document.EntitiesDescriptor.EntityDescriptor);
    entityDescriptor = descriptors[0];
  }

  if (Array.isArray(entityDescriptor)) {
    entityDescriptor = entityDescriptor[0];
  }

  if (!entityDescriptor) {
    throw new Error("Unable to locate EntityDescriptor in SAML metadata");
  }

  const entityId: string | undefined = entityDescriptor["@_entityID"];
  if (!entityId) {
    throw new Error("SAML metadata is missing an entityID");
  }

  let idpDescriptor = entityDescriptor.IDPSSODescriptor as
    | Record<string, any>
    | Array<Record<string, any>>
    | undefined;

  if (!idpDescriptor) {
    // Some metadata embeds the descriptor under RoleDescriptor or other names.
    const roleDescriptor = entityDescriptor.RoleDescriptor;
    if (roleDescriptor) {
      const descriptors = asArray<Record<string, any>>(roleDescriptor);
      idpDescriptor = descriptors.find((descriptor) => descriptor.IDPSSODescriptor) ?? descriptors[0];
      if (idpDescriptor && idpDescriptor.IDPSSODescriptor) {
        idpDescriptor = idpDescriptor.IDPSSODescriptor;
      }
    }
  }

  if (Array.isArray(idpDescriptor)) {
    idpDescriptor = idpDescriptor[0];
  }

  if (!idpDescriptor) {
    throw new Error("SAML metadata is missing an IDPSSODescriptor");
  }

  const singleSignOnServices = asArray<Record<string, any>>(idpDescriptor.SingleSignOnService);
  if (!singleSignOnServices.length) {
    throw new Error("SAML metadata does not declare any SingleSignOnService endpoints");
  }

  const httpPostService =
    singleSignOnServices.find((service) =>
      String(service["@_Binding"]).includes("HTTP-POST"),
    ) ?? singleSignOnServices[0];

  const singleLogoutServices = asArray<Record<string, any>>(idpDescriptor.SingleLogoutService);
  const logoutService =
    singleLogoutServices.find((service) =>
      String(service["@_Binding"]).includes("HTTP-POST"),
    ) ?? singleLogoutServices[0];

  const keyDescriptors = asArray<Record<string, any>>(idpDescriptor.KeyDescriptor);
  const signingKey =
    keyDescriptors.find((descriptor) => {
      const usage = descriptor["@_use"];
      return !usage || usage === "signing";
    }) ?? keyDescriptors[0];

  const certificate = signingKey?.KeyInfo?.X509Data?.X509Certificate;

  const singleSignOnLocation = httpPostService?.["@_Location"];
  if (!singleSignOnLocation) {
    throw new Error("SAML metadata is missing a SingleSignOnService location");
  }

  return {
    entityId,
    singleSignOnService: singleSignOnLocation,
    singleLogoutService: logoutService?.["@_Location"],
    certificate: certificate ? String(certificate).replace(/\s+/g, "") : undefined,
  };
}

export function parseSamlAssertion(xml: string): SamlAssertion {
  const document = parser.parse(xml);

  const response = (document.Response ?? document) as Record<string, any>;
  const assertionCandidate = response.Assertion ?? response.assertion ?? document.Assertion;
  const assertion = Array.isArray(assertionCandidate)
    ? assertionCandidate[0]
    : assertionCandidate;

  if (!assertion) {
    throw new Error("SAML response does not include an Assertion element");
  }

  const issuer =
    assertion.Issuer ??
    response.Issuer ??
    (typeof assertion.issuer === "string" ? assertion.issuer : null) ??
    null;

  const subject = assertion.Subject ?? {};
  const nameIdValue = subject.NameID ?? subject.nameId ?? null;

  const attributeStatement = assertion.AttributeStatement ?? assertion.attributeStatement;
  const attributes: Record<string, string> = {};

  const attributeNodes = asArray<Record<string, any>>(attributeStatement?.Attribute);

  for (const attribute of attributeNodes) {
    const attributeName =
      (attribute["@_Name"] as string | undefined) ??
      (attribute["@_FriendlyName"] as string | undefined);
    if (!attributeName) {
      continue;
    }

    const values = asArray(attribute.AttributeValue ?? attribute.attributeValue);
    if (!values.length) {
      continue;
    }

    const value = normaliseAttributeValue(values[0]);
    attributes[attributeName] = value;

    const friendlyName = attribute["@_FriendlyName"] as string | undefined;
    if (friendlyName && !attributes[friendlyName]) {
      attributes[friendlyName] = value;
    }
  }

  return {
    issuer: issuer ? String(issuer) : null,
    nameId: nameIdValue ? String(nameIdValue) : null,
    attributes,
  };
}
