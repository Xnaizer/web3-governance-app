import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import {
  Camera,
  Pencil,
  Wallet,
  ShieldCheck,
  Award,
  BadgeCheck,
  IdCard,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { FormInput } from "../components/ui/FormField";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { ImageCropper } from "@/components/ui/ImageCropper";
import { ZoomableImage } from "@/components/ui/Lightbox";
import { useMe } from "../hooks/useAuth";
import {
  useUpdateProfile,
  useUploadAvatar,
  useUploadBanner,
} from "../hooks/useProfile";
import { useBindWallet } from "../hooks/useBindWallet";
import { profileSchema, type ProfileForm } from "../schemas/profile";
import { getErrorMessage } from "../utils/error";
import { formatShortenAddress } from "../utils/format";

function initials(s: string): string {
  return (
    s
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ProfilePage() {
  const { data: me, isLoading } = useMe();
  const update = useUpdateProfile();
  const avatarUp = useUploadAvatar();
  const bannerUp = useUploadBanner();
  const bind = useBindWallet();
  const { address, isConnected } = useAccount();

  const { control, handleSubmit } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: me
      ? {
          name: me.name ?? "",
          nik: me.nik ?? "",
          nip: me.nip ?? "",
          institution: me.institution ?? "",
          position: me.position ?? "",
          birthPlace: me.birthPlace ?? "",
          birthDate: me.birthDate ? me.birthDate.slice(0, 10) : "",
          address: me.address ?? "",
          phone: me.phone ?? "",
          nationality: me.nationality ?? "",
        }
      : undefined,
  });

  if (isLoading) return <BrandLoader />;
  if (!me) return null;

  const onSubmit = handleSubmit(async (values) => {
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "" && v != null),
    );
    try {
      await update.mutateAsync(payload);
      toast.success("Profil diperbarui.");
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  });

  const [cropTarget, setCropTarget] = useState<{
    file: File;
    kind: "avatar" | "banner";
  } | null>(null);

  const onFile = (file: File | undefined, kind: "avatar" | "banner") => {
    if (!file) return;
    setCropTarget({ file, kind });
  };

  const onCropSave = ({ file: cropped }: { blob: Blob; file: File }) => {
    const kind = cropTarget?.kind;
    if (!kind) return;
    const m = kind === "avatar" ? avatarUp : bannerUp;
    const pr = m.mutateAsync(cropped);
    toast.promise(pr, {
      loading: "Mengunggah…",
      success: "Foto diperbarui.",
      error: (e) => getErrorMessage(e),
    });
    pr.finally(() => setCropTarget(null));
  };

  const onBind = () =>
    toast.promise(bind.mutateAsync(), {
      loading: "Menandatangani…",
      success: "Wallet terhubung.",
      error: (e) => getErrorMessage(e),
    });

  const repTone =
    me.reputationScore < 35
      ? "text-destructive"
      : me.reputationScore < 50
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        gradient
        subtitle="Kelola identitas, wallet, dan foto profil Anda."
      />

     
      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-none">
        <div className="relative">
          <div className="h-44 w-full overflow-hidden bg-linear-to-br from-brand-mint to-brand-blue">
            {me.profileBannerURL && (
              <ZoomableImage
                src={me.profileBannerURL}
                alt="banner"
                className="h-full w-full object-cover"
                wrapperClassName="h-full w-full"
              />
            )}
          </div>
          <label
            htmlFor="banner-input"
            className="absolute right-3 top-3 flex cursor-pointer items-center gap-1.5 rounded-lg bg-background/85 px-3 py-1.5 text-sm font-medium backdrop-blur transition-colors hover:bg-background"
          >
            <Camera className="h-4 w-4" />
            {bannerUp.isPending ? "Mengunggah…" : "Ganti Banner"}
            <input
              id="banner-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0], "banner")}
            />
          </label>
          <div className="absolute -bottom-11 left-6">
            <div className="relative">
              {me.profilePictureURL ? (
                <ZoomableImage
                  src={me.profilePictureURL}
                  alt={me.username}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-none"
                  wrapperClassName="h-24 w-24 rounded-full"
                />
              ) : (
                <Avatar className="h-24 w-24 text-xl ring-4 ring-white shadow-none">
                  <AvatarFallback>
                    {initials(me.name ?? me.username)}
                  </AvatarFallback>
                </Avatar>
              )}
              <label
                htmlFor="avatar-input"
                aria-label="Ganti foto profil"
                className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-blue text-white transition-opacity hover:opacity-90"
              >
                {avatarUp.isPending ? (
                  <Spinner size={14} className="text-current" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0], "avatar")}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 pt-14 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {me.name ?? me.username}
              </h2>
              <Badge className="rounded-full">{me.role}</Badge>
              {me.isVerified && (
                <Badge variant="success" className="gap-1 rounded-full">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              @{me.username} · {me.email}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-muted/40 px-4 py-2.5">
            <Award className={`h-5 w-5 ${repTone}`} />
            <div>
              <p
                className={`font-display text-xl font-semibold leading-none ${repTone}`}
              >
                {me.reputationScore}
              </p>
              <p className="text-[11px] text-muted-foreground">Reputasi</p>
            </div>
          </div>
        </div>
      </div>

   
      <div className="grid gap-6 lg:grid-cols-3">
     
        <Card className="rounded-2xl border-black/5 shadow-none lg:col-span-2">
          <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
            <IdCard className="h-4 w-4 text-brand-blue" /> Data Identitas
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <FormInput control={control} name="name" label="Nama" />
              <FormInput control={control} name="nik" label="NIK" />
              <FormInput control={control} name="nip" label="NIP" />
              <FormInput
                control={control}
                name="institution"
                label="Institusi"
              />
              <FormInput control={control} name="position" label="Jabatan" />
              <FormInput control={control} name="phone" label="Telepon" />
              <FormInput
                control={control}
                name="birthPlace"
                label="Tempat Lahir"
              />
              <FormInput
                control={control}
                name="birthDate"
                label="Tanggal Lahir"
                type="date"
              />
              <FormInput
                control={control}
                name="nationality"
                label="Kewarganegaraan"
              />
              <FormInput
                control={control}
                name="address"
                label="Alamat"
                className="sm:col-span-2"
              />
              <Button
                type="submit"
                disabled={update.isPending}
                className="w-fit sm:col-span-2"
              >
                {update.isPending && (
                  <Spinner size={16} className="text-current" />
                )}
                Simpan Perubahan
              </Button>
            </form>
          </CardContent>
        </Card>

  
        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl border-black/5 shadow-none">
            <CardHeader className="flex-row items-center gap-2 space-y-0 font-display font-semibold tracking-tight">
              <Wallet className="h-4 w-4 text-brand-blue" /> Wallet
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {me.walletAddress ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-mono text-sm">
                    {formatShortenAddress(me.walletAddress)}
                  </span>
                  <Badge variant="success" className="ml-auto rounded-full">
                    terhubung
                  </Badge>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Hubungkan lalu tanda tangani nonce untuk mengikat wallet ke
                    akun (sekali, sebelum punya role).
                  </p>
                  <ConnectButton showBalance={false} chainStatus="icon" />
                  <Button
                    disabled={!isConnected || bind.isPending}
                    onClick={onBind}
                  >
                    {bind.isPending && (
                      <Spinner size={16} className="text-current" />
                    )}
                    Bind Wallet{" "}
                    {address ? `(${formatShortenAddress(address)})` : ""}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-black/5 shadow-none">
            <CardHeader className="font-display font-semibold tracking-tight">
              Status Akun
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-black/5 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Email aktif</span>
                <Badge
                  variant={me.isActive ? "success" : "warning"}
                  className="rounded-full"
                >
                  {me.isActive ? "Ya" : "Belum"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">
                  Identitas diverifikasi
                </span>
                <Badge
                  variant={me.isVerified ? "success" : "warning"}
                  className="rounded-full"
                >
                  {me.isVerified ? "Ya" : "Belum"}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">Peran</span>
                <Badge className="rounded-full">{me.role}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ImageCropper
        file={cropTarget?.file ?? null}
        aspect={cropTarget?.kind === "banner" ? 3 : 1}
        title={
          cropTarget?.kind === "banner" ? "Sesuaikan Banner" : "Sesuaikan Foto Profil"
        }
        outputWidth={cropTarget?.kind === "banner" ? 1200 : 512}
        isSaving={avatarUp.isPending || bannerUp.isPending}
        onCancel={() => setCropTarget(null)}
        onSave={onCropSave}
      />
    </div>
  );
}