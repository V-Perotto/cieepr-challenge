-- 0001: tabela de candidatos (specs/001-candidate-registration/data-model.md §1)

CREATE TABLE dbo.Candidates (
    Id                  INT IDENTITY(1,1) NOT NULL
        CONSTRAINT PK_Candidates PRIMARY KEY,
    FullName            NVARCHAR(250) NOT NULL
        CONSTRAINT CK_Candidates_FullName_NotBlank CHECK (LEN(LTRIM(RTRIM(FullName))) > 0),
    Email               NVARCHAR(250) COLLATE Latin1_General_100_CI_AS NOT NULL
        CONSTRAINT UQ_Candidates_Email UNIQUE,
    Phone               VARCHAR(11) NULL
        CONSTRAINT CK_Candidates_Phone_Digits
            CHECK (Phone IS NULL OR (LEN(Phone) IN (10, 11) AND Phone NOT LIKE '%[^0-9]%')),
    AreaOfInterest      NVARCHAR(250) NULL,
    ProfessionalSummary NVARCHAR(1000) NULL,
    CreatedAt           DATETIME2(3) NOT NULL
        CONSTRAINT DF_Candidates_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

CREATE INDEX IX_Candidates_CreatedAt
    ON dbo.Candidates (CreatedAt DESC)
    INCLUDE (FullName, Email, AreaOfInterest);
GO
