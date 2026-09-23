import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyPage from './VerifyPage';
import { verifyApi } from '../api/client';

jest.mock('../api/client', () => ({
  apiErrorMessage: (_error: unknown, fallback: string) => fallback,
  verifyApi: {
    byHash: jest.fn(),
    byFile: jest.fn(),
    bulk: jest.fn(),
    certificateUrl: (hash: string) => `http://api.test/verify/${hash}/certificate`
  }
}));

const mockedVerifyApi = verifyApi as jest.Mocked<typeof verifyApi>;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<VerifyPage />} />
        <Route path="/verify/:hash" element={<VerifyPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the hash form and the upload dropzone', () => {
  renderAt('/');

  expect(screen.getByRole('heading', { name: /verify a credential/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/credential hash/i)).toBeInTheDocument();
  expect(screen.getByText(/drag certificates here/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^verify$/i })).toBeDisabled();
});

test('a hash in the URL is verified on mount and rendered as valid', async () => {
  mockedVerifyApi.byHash.mockResolvedValue({
    hash: '0xfeed',
    status: 'valid',
    onChain: null,
    credential: {
      studentName: 'Blessed Simalimbu',
      degree: 'BSc Computer Science',
      program: null,
      honors: null,
      graduationDate: '2024-06-30',
      institution: 'Integration University',
      issuedAt: '2024-07-01T00:00:00.000Z',
      revokedAt: null,
      revocationReason: null,
      blockchainTxHash: null
    }
  });

  renderAt('/verify/0xfeed');

  expect(await screen.findByText('Blessed Simalimbu')).toBeInTheDocument();
  expect(screen.getByText('Valid')).toBeInTheDocument();
  expect(mockedVerifyApi.byHash).toHaveBeenCalledWith('0xfeed');
});

test('an unknown hash renders the not-found state', async () => {
  mockedVerifyApi.byHash.mockResolvedValue({
    hash: '0xdead',
    status: 'not_found',
    onChain: null,
    credential: null
  });

  renderAt('/verify/0xdead');

  expect(await screen.findByText('Not found')).toBeInTheDocument();
  expect(screen.getByText('No credential matches this hash.')).toBeInTheDocument();
});

test('a failed lookup surfaces an error instead of a result card', async () => {
  mockedVerifyApi.byHash.mockRejectedValue(new Error('boom'));

  renderAt('/verify/not-a-hash');

  expect(await screen.findByRole('alert')).toHaveTextContent(/verification failed/i);
});

test('submitting the form navigates to the hash route and verifies it', async () => {
  const user = userEvent.setup();
  mockedVerifyApi.byHash.mockResolvedValue({
    hash: '0xtyped',
    status: 'valid',
    onChain: null,
    credential: null
  });

  renderAt('/');

  await user.type(screen.getByLabelText(/credential hash/i), '0xtyped');
  await user.click(screen.getByRole('button', { name: /^verify$/i }));

  await waitFor(() => expect(mockedVerifyApi.byHash).toHaveBeenCalledWith('0xtyped'));
});

test('uploading a single file verifies it by file hash', async () => {
  const user = userEvent.setup();
  mockedVerifyApi.byFile.mockResolvedValue({
    hash: '0xfile',
    status: 'valid',
    onChain: null,
    credential: null
  });

  const { container } = renderAt('/');
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(['%PDF-1.4'], 'certificate.pdf', { type: 'application/pdf' });

  await user.upload(input, file);

  await waitFor(() => expect(mockedVerifyApi.byFile).toHaveBeenCalledWith(file));
  expect(await screen.findByText('Valid')).toBeInTheDocument();
});

test('uploading several files uses the bulk endpoint and labels each file', async () => {
  const user = userEvent.setup();
  mockedVerifyApi.bulk.mockResolvedValue([
    { hash: '0x1', status: 'valid', onChain: null, credential: null, fileName: 'one.pdf' },
    { hash: '0x2', status: 'not_found', onChain: null, credential: null, fileName: 'two.pdf' }
  ]);

  const { container } = renderAt('/');
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;

  await user.upload(input, [
    new File(['a'], 'one.pdf', { type: 'application/pdf' }),
    new File(['b'], 'two.pdf', { type: 'application/pdf' })
  ]);

  expect(await screen.findByText('one.pdf')).toBeInTheDocument();
  expect(screen.getByText('two.pdf')).toBeInTheDocument();
  expect(mockedVerifyApi.bulk).toHaveBeenCalled();
});
