import { PlatformContract, RentedAccount } from '../types';
import { fetchCollection, updateDocument } from './dataService';

const normalize = (value: string | undefined): string =>
  (value || '').trim().toLowerCase().replace(/[^a-z0-9\u0621-\u064A]/g, '');

export async function syncRegisteredRentedAccountsToActiveContracts(): Promise<{
  linkedCount: number;
  skippedCount: number;
}> {
  const [accounts, contracts] = await Promise.all([
    fetchCollection<RentedAccount>('rented_accounts'),
    fetchCollection<PlatformContract>('platform_contracts', { status: 'active' }),
  ]);

  let linkedCount = 0;
  let skippedCount = 0;

  for (const account of accounts) {
    const existingLink = contracts.find(
      (contract) => contract.id === account.platformContractId ||
        (!!account.platformId && (contract.platformId === account.platformId || contract.id === account.platformId))
    );
    const matchedContract = existingLink || contracts.find(
      (contract) => normalize(contract.name) === normalize(account.platformName)
    );

    if (!matchedContract) {
      skippedCount++;
      continue;
    }

    const platformId = matchedContract.platformId || matchedContract.id;
    if (account.platformContractId === matchedContract.id && account.platformId === platformId) continue;

    await updateDocument<RentedAccount>('rented_accounts', account.id, {
      platformContractId: matchedContract.id,
      platformId,
      platformName: matchedContract.name,
      updatedAt: new Date().toISOString(),
    });
    linkedCount++;
  }

  return { linkedCount, skippedCount };
}

export async function syncDriverIdlePlatformsToFreelancerPool(
  driver: { id: string; iqamaNumber?: string } | null | undefined,
  _primaryPlatform?: string,
  _autoGenerate?: boolean,
  _monthlyRate?: number,
  _currentUser?: unknown
): Promise<{ createdCount: 0; updatedCount: number }> {
  if (!driver?.id) return { createdCount: 0, updatedCount: 0 };

  const [accounts, contracts] = await Promise.all([
    fetchCollection<RentedAccount>('rented_accounts'),
    fetchCollection<PlatformContract>('platform_contracts', { status: 'active' }),
  ]);
  const driverAccounts = accounts.filter(
    (account) => account.originDriverId === driver.id ||
      (!!driver.iqamaNumber && account.originDriverIqama === driver.iqamaNumber)
  );
  let updatedCount = 0;

  for (const account of driverAccounts) {
    const contract = contracts.find(
      (candidate) => candidate.id === account.platformContractId ||
        (!!account.platformId && (candidate.platformId === account.platformId || candidate.id === account.platformId))
    ) || contracts.find((candidate) => normalize(candidate.name) === normalize(account.platformName));
    if (!contract) continue;

    await updateDocument<RentedAccount>('rented_accounts', account.id, {
      platformContractId: contract.id,
      platformId: contract.platformId || contract.id,
      platformName: contract.name,
      updatedAt: new Date().toISOString(),
    });
    updatedCount++;
  }

  return { createdCount: 0, updatedCount };
}